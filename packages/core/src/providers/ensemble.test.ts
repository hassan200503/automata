import { describe, it, expect } from 'vitest';
import { MockProvider } from './mock-provider.js';
import { ProviderError, type ChatCompletionChunk, type ChatCompletionRequest, type ChatCompletionResponse, type ChatProvider } from './contracts.js';
import {
  EnsembleProvider,
  defaultEnsembleJudge,
  majorityEnsembleJudge,
  scoreResponse,
  type EnsembleCandidate,
} from './ensemble.js';

function request(overrides: Partial<ChatCompletionRequest> = {}): ChatCompletionRequest {
  return { model: 'test-model', messages: [{ role: 'user', content: 'What is 2 + 2?' }], ...overrides };
}

function candidate(content: string, extra: Partial<EnsembleCandidate> = {}): EnsembleCandidate {
  return {
    providerId: extra.providerId ?? 'p',
    model: 'm',
    content,
    response: { model: 'm', content, finishReason: 'stop' },
    latencyMs: extra.latencyMs ?? 1,
    score: extra.score ?? 0,
    weight: extra.weight ?? 1,
  };
}

/** A provider whose complete() rejects as soon as the signal aborts. */
class AbortableProvider implements ChatProvider {
  readonly id: string;
  readonly name = 'Abortable';
  constructor(id: string, private readonly delayMs: number, private readonly content: string) {
    this.id = id;
  }
  async capabilities() {
    return { streaming: false, maxContextLength: 1000, functionCalling: false, vision: false, jsonMode: true };
  }
  async healthCheck() {
    return { healthy: true, lastCheck: Date.now(), latency: this.delayMs };
  }
  complete(_req: ChatCompletionRequest, signal: AbortSignal): Promise<ChatCompletionResponse> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve({ model: 'm', content: this.content, finishReason: 'stop' }), this.delayMs);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(signal.reason instanceof Error ? signal.reason : new Error('aborted'));
      }, { once: true });
    });
  }
  async *stream(): AsyncIterable<ChatCompletionChunk> {
    yield { delta: this.content };
  }
}

describe('ensemble scoring', () => {
  it('penalizes empty answers', () => {
    expect(scoreResponse('', request())).toBeLessThan(scoreResponse('four', request()));
  });
  it('penalizes refusals', () => {
    const refusal = scoreResponse('I cannot help with that.', request());
    const answer = scoreResponse('The result is four.', request());
    expect(answer).toBeGreaterThan(refusal);
  });
  it('prefers valid JSON when json mode is requested', () => {
    const req = request({ jsonMode: true });
    expect(scoreResponse('{"ok":true}', req)).toBeGreaterThan(scoreResponse('not json at all', req));
  });
});

describe('defaultEnsembleJudge', () => {
  it('selects the highest scoring candidate', () => {
    const good = candidate('The result is four.', { providerId: 'good' });
    const bad = candidate('I cannot answer that.', { providerId: 'bad' });
    const index = defaultEnsembleJudge([bad, good], request());
    expect(index).toBe(1);
  });
  it('breaks ties by weight then latency', () => {
    const heavy = candidate('same', { providerId: 'heavy', weight: 3, latencyMs: 50 });
    const light = candidate('same', { providerId: 'light', weight: 1, latencyMs: 1 });
    expect(defaultEnsembleJudge([light, heavy], request())).toBe(1);
  });
});

describe('majorityEnsembleJudge', () => {
  it('picks the answer shared by the most weight', () => {
    const a = candidate('Four.', { providerId: 'a', weight: 1 });
    const b = candidate('four', { providerId: 'b', weight: 1 });
    const c = candidate('Five.', { providerId: 'c', weight: 1 });
    expect(majorityEnsembleJudge([a, b, c])).toBe(0);
  });
});

describe('EnsembleProvider.complete', () => {
  it('best-of returns the strongest answer', async () => {
    const ensemble = new EnsembleProvider([
      { provider: new MockProvider({ id: 'weak', responseContent: 'I cannot do that.' }) },
      { provider: new MockProvider({ id: 'strong', responseContent: 'Four. Two plus two equals four.' }) },
    ]);
    const result = await ensemble.complete(request(), new AbortController().signal);
    expect(result.content).toContain('Four');
    expect(ensemble.getLastRun()?.winnerId).toBe('strong');
    expect(ensemble.getLastRun()?.candidates).toHaveLength(2);
  });

  it('fastest returns the lowest-latency answer', async () => {
    const ensemble = new EnsembleProvider([
      { provider: new MockProvider({ id: 'slow', latency: 60, responseContent: 'slow answer' }) },
      { provider: new MockProvider({ id: 'quick', latency: 0, responseContent: 'quick answer' }) },
    ], { strategy: 'fastest' });
    const result = await ensemble.complete(request(), new AbortController().signal);
    expect(result.content).toBe('quick answer');
    expect(ensemble.getLastRun()?.winnerId).toBe('quick');
  });

  it('majority returns the agreed answer', async () => {
    const ensemble = new EnsembleProvider([
      { provider: new MockProvider({ id: 'a', responseContent: 'The answer is four.' }) },
      { provider: new MockProvider({ id: 'b', responseContent: 'the answer is four' }) },
      { provider: new MockProvider({ id: 'c', responseContent: 'It is definitely five hundred.' }) },
    ], { strategy: 'majority' });
    const result = await ensemble.complete(request(), new AbortController().signal);
    expect(result.content.toLowerCase()).toContain('four');
  });

  it('times out slow members but keeps the answers that arrived', async () => {
    const ensemble = new EnsembleProvider([
      { provider: new AbortableProvider('fast', 0, 'fast answer') },
      { provider: new AbortableProvider('stuck', 5000, 'never arrives') },
    ], { timeoutMs: 60, strategy: 'fastest' });
    const result = await ensemble.complete(request(), new AbortController().signal);
    expect(result.content).toBe('fast answer');
    expect(ensemble.getLastRun()?.failures.some((f) => f.providerId === 'stuck')).toBe(true);
  });

  it('throws provider_down when every member fails', async () => {
    const ensemble = new EnsembleProvider([
      { provider: new MockProvider({ id: 'one', completeError: new ProviderError('auth_invalid', 'bad key', false) }) },
      { provider: new MockProvider({ id: 'two', completeError: new ProviderError('auth_invalid', 'bad key', false) }) },
    ]);
    await expect(ensemble.complete(request(), new AbortController().signal)).rejects.toBeInstanceOf(ProviderError);
  });

  it('delegates to a single member without fan-out', async () => {
    const only = new MockProvider({ id: 'only', responseContent: 'solo answer' });
    const ensemble = new EnsembleProvider([{ provider: only }]);
    const result = await ensemble.complete(request(), new AbortController().signal);
    expect(result.content).toBe('solo answer');
    expect(only.getCompleteCalls()).toHaveLength(1);
  });

  it('honors an injected judge', async () => {
    const ensemble = new EnsembleProvider([
      { provider: new MockProvider({ id: 'a', responseContent: 'first' }) },
      { provider: new MockProvider({ id: 'b', responseContent: 'second' }) },
    ], { judge: (candidates) => candidates.findIndex((c) => c.content === 'second') });
    const result = await ensemble.complete(request(), new AbortController().signal);
    expect(result.content).toBe('second');
  });

  it('propagates abort before starting', async () => {
    const ensemble = new EnsembleProvider([{ provider: new MockProvider({ id: 'a' }) }]);
    const controller = new AbortController();
    controller.abort();
    await expect(ensemble.complete(request(), controller.signal)).rejects.toBeTruthy();
  });
});

describe('EnsembleProvider health and capabilities', () => {
  it('is healthy when at least one member is healthy', async () => {
    const ensemble = new EnsembleProvider([
      { provider: new MockProvider({ id: 'down', unhealthy: true }) },
      { provider: new MockProvider({ id: 'up' }) },
    ]);
    expect((await ensemble.healthCheck()).healthy).toBe(true);
  });
  it('merges capabilities from members', async () => {
    const ensemble = new EnsembleProvider([
      { provider: new MockProvider({ id: 'a' }) },
      { provider: new MockProvider({ id: 'b' }) },
    ]);
    const caps = await ensemble.capabilities();
    expect(caps.streaming).toBe(true);
    expect(caps.maxContextLength).toBeGreaterThan(0);
  });
});

describe('EnsembleProvider.stream', () => {
  it('streams from the highest-weight member', async () => {
    const ensemble = new EnsembleProvider([
      { provider: new MockProvider({ id: 'low', responseContent: 'low priority words', latency: 0 }), weight: 1 },
      { provider: new MockProvider({ id: 'high', responseContent: 'high priority words', latency: 0 }), weight: 5 },
    ]);
    let text = '';
    for await (const chunk of ensemble.stream(request(), new AbortController().signal)) {
      text += chunk.delta;
    }
    expect(text).toContain('high');
  });
});
