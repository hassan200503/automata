/**
 * Multi-model ensemble provider
 *
 * "Combine the intelligence": instead of trusting a single model, the ensemble
 * asks several configured providers the same question and returns the single
 * best answer. It implements the same {@link ChatProvider} interface as a normal
 * provider, so it can be registered on the router like any other provider and
 * automatically participates in failover, quota tracking and circuit breaking.
 *
 * Combining strategies:
 *  - `best-of`  : every member answers in parallel; a deterministic judge picks
 *                 the strongest answer. (default)
 *  - `majority` : members that agree on the same normalized answer win by weight;
 *                 ties fall back to the judge.
 *  - `fastest`  : the first member to answer wins — lowest latency, no judging.
 *
 * The ensemble never runs the host's tools and never claims anything about an
 * answer beyond picking it; the host still validates and executes plans. A run
 * log records which members answered, their latency and the winner, so the
 * decision is auditable.
 */

import type {
  AudioTranscriptionRequest,
  AudioTranscriptionResult,
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatProvider,
  HealthStatus,
  ProviderCapabilities,
} from './contracts.js';
import { ProviderError } from './contracts.js';

export type EnsembleStrategy = 'fastest' | 'best-of' | 'majority';

export interface EnsembleMember {
  provider: ChatProvider;
  /** Force this model id for the member's request (falls back to the request model). */
  model?: string;
  /** Relative influence in votes and tie-breaks. Higher wins. Defaults to 1. */
  weight?: number;
}

export interface EnsembleCandidate {
  providerId: string;
  model: string;
  content: string;
  response: ChatCompletionResponse;
  latencyMs: number;
  score: number;
  weight: number;
}

export interface EnsembleFailure {
  providerId: string;
  error: string;
}

export interface EnsembleRun {
  strategy: EnsembleStrategy;
  startedAt: number;
  durationMs: number;
  candidates: EnsembleCandidate[];
  failures: EnsembleFailure[];
  winnerId?: string;
}

/** Selects the winning candidate index, or -1 to reject all candidates. */
export type EnsembleJudge = (
  candidates: EnsembleCandidate[],
  request: ChatCompletionRequest
) => number;

export interface EnsembleOptions {
  id?: string;
  name?: string;
  strategy?: EnsembleStrategy;
  /** Total budget for the parallel fan-out in milliseconds. Defaults to 20000. */
  timeoutMs?: number;
  /** Override the deterministic selector (used by tests and advanced tuning). */
  judge?: EnsembleJudge;
}

/** Phrases that indicate a refusal or a non-answer rather than work done. */
const HEDGE_OR_REFUSAL = [
  /\bas an ai\b/i,
  /\bi (?:can(?:not|'t)|am unable|am not able|won'?t|will not)\b/i,
  /\bi'?m sorry\b/i,
  /\bi don'?t know\b/i
];

function normalizeForComparison(content: string): string {
  return content
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyJson(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deterministic score for one answer. Higher is better.
 * Rewards concrete, complete answers and penalizes empty answers, refusals and
 * malformed JSON when JSON was requested.
 */
export function scoreResponse(content: string, request: ChatCompletionRequest): number {
  const text = (content ?? '').trim();
  if (!text) return -1000;

  let score = 0;

  if (request.jsonMode) {
    score += isLikelyJson(text) ? 60 : -40;
  }

  for (const pattern of HEDGE_OR_REFUSAL) {
    if (pattern.test(text)) score -= 50;
  }

  // Prefer substantive answers, but cap the reward so a rambling answer does
  // not beat a precise one.
  score += Math.min(text.length, 600) / 20;
  if (text.length > 4000) score -= (text.length - 4000) / 200;

  return score;
}

/** Default best-of judge: highest score, then weight, then lowest latency. */
export function defaultEnsembleJudge(
  candidates: EnsembleCandidate[],
  request: ChatCompletionRequest
): number {
  const first = candidates[0];
  if (!first) return -1;
  let bestIndex = 0;
  let best = first;
  best.score = scoreResponse(best.content, request);
  for (let index = 1; index < candidates.length; index += 1) {
    const current = candidates[index];
    if (!current) continue;
    current.score = scoreResponse(current.content, request);
    const better =
      current.score > best.score ||
      (current.score === best.score && current.weight > best.weight) ||
      (current.score === best.score && current.weight === best.weight && current.latencyMs < best.latencyMs);
    if (better) {
      bestIndex = index;
      best = current;
    }
  }
  return bestIndex;
}

/** Majority vote keyed on the normalized answer, weighted by member weight. */
export function majorityEnsembleJudge(candidates: EnsembleCandidate[]): number {
  const groups = new Map<string, { count: number; weight: number; firstIndex: number }>();
  candidates.forEach((candidate, index) => {
    const key = normalizeForComparison(candidate.content);
    const group = groups.get(key);
    if (group) {
      group.count += 1;
      group.weight += candidate.weight;
    } else {
      groups.set(key, { count: 1, weight: candidate.weight, firstIndex: index });
    }
  });

  let winner = -1;
  let bestWeight = -1;
  let bestCount = -1;
  for (const group of groups.values()) {
    if (group.weight > bestWeight || (group.weight === bestWeight && group.count > bestCount)) {
      bestWeight = group.weight;
      bestCount = group.count;
      winner = group.firstIndex;
    }
  }
  return winner;
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error('Request aborted');
}

export class EnsembleProvider implements ChatProvider {
  readonly id: string;
  readonly name: string;

  private readonly members: EnsembleMember[];
  private readonly strategy: EnsembleStrategy;
  private readonly timeoutMs: number;
  private readonly judge: EnsembleJudge;
  private lastRun?: EnsembleRun;

  constructor(members: EnsembleMember[], options: EnsembleOptions = {}) {
    this.members = members;
    this.id = options.id ?? 'ensemble';
    this.name = options.name ?? 'Combined intelligence';
    this.strategy = options.strategy ?? 'best-of';
    this.timeoutMs = options.timeoutMs ?? 20000;
    this.judge = options.judge ?? defaultEnsembleJudge;
  }

  getMembers(): EnsembleMember[] {
    return [...this.members];
  }

  getLastRun(): EnsembleRun | undefined {
    return this.lastRun;
  }

  private primaryMember(): EnsembleMember | undefined {
    return (
      [...this.members].sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))[0] ?? this.members[0]
    );
  }

  async capabilities(): Promise<ProviderCapabilities> {
    const merged: ProviderCapabilities = {
      streaming: false,
      maxContextLength: 0,
      functionCalling: true,
      vision: false,
      jsonMode: true,
    };
    for (const member of this.members) {
      try {
        const caps = await member.provider.capabilities(member.model);
        merged.streaming = merged.streaming || caps.streaming;
        merged.maxContextLength = Math.max(merged.maxContextLength, caps.maxContextLength);
        merged.functionCalling = merged.functionCalling && caps.functionCalling;
        merged.vision = merged.vision || caps.vision;
        merged.jsonMode = merged.jsonMode && caps.jsonMode;
      } catch {
        // A member that cannot report capabilities does not block the ensemble.
      }
    }
    return merged;
  }

  async healthCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled(this.members.map((m) => m.provider.healthCheck()));
    let bestLatency: number | undefined;
    for (const check of checks) {
      if (check.status === 'fulfilled' && check.value.healthy) {
        if (typeof check.value.latency === 'number') {
          bestLatency = bestLatency === undefined ? check.value.latency : Math.min(bestLatency, check.value.latency);
        }
        return { healthy: true, lastCheck: Date.now(), latency: bestLatency };
      }
    }
    return {
      healthy: false,
      lastCheck: Date.now(),
      error: new ProviderError('provider_down', 'No ensemble member is healthy'),
    };
  }

  async complete(
    request: ChatCompletionRequest,
    signal: AbortSignal
  ): Promise<ChatCompletionResponse> {
    if (signal.aborted) throw abortError(signal);

    if (this.members.length === 0) {
      throw new ProviderError('provider_down', 'No ensemble members configured', false);
    }
    if (this.members.length === 1) {
      const only = this.members[0];
      if (!only) throw new ProviderError('provider_down', 'No ensemble members configured', false);
      return only.provider.complete(this.memberRequest(request, only), signal);
    }

    const startedAt = Date.now();
    const candidates: EnsembleCandidate[] = [];
    const failures: EnsembleFailure[] = [];
    const controller = new AbortController();
    const onOuterAbort = () => controller.abort(signal.reason);
    signal.addEventListener('abort', onOuterAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new ProviderError('timeout', 'Ensemble fan-out timed out')), this.timeoutMs);

    try {
      await Promise.all(
        this.members.map(async (member) => {
          const memberStarted = Date.now();
          try {
            const response = await this.raceAbort(member.provider.complete(this.memberRequest(request, member), controller.signal), controller.signal);
            if (controller.signal.aborted) return;
            candidates.push({
              providerId: member.provider.id,
              model: response.model,
              content: response.content,
              response,
              latencyMs: Date.now() - memberStarted,
              score: 0,
              weight: member.weight ?? 1,
            });
          } catch (error) {
            if (signal.aborted) return;
            failures.push({
              providerId: member.provider.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', onOuterAbort);
    }

    if (signal.aborted) throw abortError(signal);

    const run: EnsembleRun = {
      strategy: this.strategy,
      startedAt,
      durationMs: Date.now() - startedAt,
      candidates,
      failures,
      winnerId: undefined,
    };

    if (candidates.length === 0) {
      this.lastRun = run;
      throw new ProviderError(
        'provider_down',
        `Every ensemble member failed: ${failures.map((f) => `${f.providerId}: ${f.error}`).join('; ')}`,
        false
      );
    }

    const winner = this.selectWinner(candidates, request);
    run.winnerId = winner.providerId;
    this.lastRun = run;

    return {
      ...winner.response,
      metadata: { ...(winner.response.metadata ?? {}), ensemble: run },
    };
  }

  async *stream(
    request: ChatCompletionRequest,
    signal: AbortSignal
  ): AsyncIterable<ChatCompletionChunk> {
    if (signal.aborted) throw abortError(signal);
    // Streaming is latency-sensitive and token streams cannot be merged, so the
    // ensemble streams from its strongest member. Failover to other members is
    // still handled by the router (it treats the ensemble as one provider).
    const primary = this.primaryMember();
    if (!primary) {
      throw new ProviderError('provider_down', 'No ensemble members configured', false);
    }
    yield* primary.provider.stream(this.memberRequest(request, primary), signal);
  }

  async transcribe(
    request: AudioTranscriptionRequest,
    signal: AbortSignal
  ): Promise<AudioTranscriptionResult> {
    for (const member of this.members) {
      if (!member.provider.transcribe) continue;
      try {
        return await member.provider.transcribe(
          member.model ? { ...request, model: member.model } : request,
          signal
        );
      } catch (error) {
        if (signal.aborted) throw error;
      }
    }
    throw new ProviderError('bad_request', 'No ensemble member supports speech transcription', false);
  }

  private memberRequest(request: ChatCompletionRequest, member: EnsembleMember): ChatCompletionRequest {
    return member.model ? { ...request, model: member.model } : request;
  }

  /**
   * Resolve a member call, but reject as soon as the shared signal aborts. This
   * enforces the fan-out budget even when a member ignores the abort signal.
   */
  private raceAbort<T>(call: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) return Promise.reject(signal.reason ?? new Error('Request aborted'));
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(signal.reason ?? new Error('Request aborted'));
      signal.addEventListener('abort', onAbort, { once: true });
      call.then(
        (value) => {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        (error) => {
          signal.removeEventListener('abort', onAbort);
          reject(error);
        }
      );
    });
  }

  private selectWinner(candidates: EnsembleCandidate[], request: ChatCompletionRequest): EnsembleCandidate {
    const fallback = candidates[0];
    if (this.strategy === 'fastest') {
      let best = fallback;
      if (!best) throw new ProviderError('provider_down', 'No ensemble candidates', false);
      for (const current of candidates) {
        if (current.latencyMs < best.latencyMs) best = current;
      }
      return best;
    }
    if (this.strategy === 'majority') {
      const majority = candidates[majorityEnsembleJudge(candidates)];
      if (majority) return majority;
    }
    const judged = this.judge(candidates, request);
    const chosen = judged >= 0 ? candidates[judged] : undefined;
    if (chosen) return chosen;
    if (fallback) return fallback;
    throw new ProviderError('provider_down', 'No ensemble candidates', false);
  }
}
