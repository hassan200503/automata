import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AGGRESSIVE_RETRY_CONFIG,
  CONSERVATIVE_RETRY_CONFIG,
  DEFAULT_RETRY_CONFIG,
  RetryPolicy,
  type RetryConfig,
} from './retry-policy.js';
import { MaxRetriesExceededError } from './types.js';

class FlakyError extends Error {
  constructor(message = 'flaky') {
    super(message);
    this.name = 'FlakyError';
  }
}

class FatalError extends Error {
  constructor(message = 'fatal') {
    super(message);
    this.name = 'FatalError';
  }
}

const baseConfig: RetryConfig = {
  maxAttempts: 4,
  baseDelayMs: 100,
  maxDelayMs: 1000,
  backoffMultiplier: 2,
  jitterPercent: 0,
  retryableErrors: ['FlakyError'],
};

describe('RetryPolicy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the result without retrying when the operation succeeds', async () => {
    const policy = new RetryPolicy(baseConfig);
    const operation = vi.fn().mockResolvedValue('ok');

    await expect(policy.executeWithRetry(operation, 'op')).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('re-throws a non-retryable error immediately', async () => {
    const policy = new RetryPolicy(baseConfig);
    const error = new FatalError();
    const operation = vi.fn().mockRejectedValue(error);

    await expect(policy.executeWithRetry(operation, 'op')).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries a retryable error and returns a later success', async () => {
    const policy = new RetryPolicy(baseConfig);
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new FlakyError())
      .mockRejectedValueOnce(new FlakyError())
      .mockResolvedValue('recovered');

    const promise = policy.executeWithRetry(operation, 'op');
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('recovered');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('throws MaxRetriesExceededError carrying the key, attempts and last error', async () => {
    const policy = new RetryPolicy({ ...baseConfig, maxAttempts: 3 });
    const last = new FlakyError('third failure');
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new FlakyError('first'))
      .mockRejectedValueOnce(new FlakyError('second'))
      .mockRejectedValueOnce(last);

    const promise = policy.executeWithRetry(operation, 'my-key');
    const settled = promise.catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const caught = await settled;

    expect(caught).toBeInstanceOf(MaxRetriesExceededError);
    expect(caught).toMatchObject({ attempts: 3, lastError: last });
    expect((caught as Error).message).toContain('my-key');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('wraps a non-Error rejection into an Error before classifying it', async () => {
    const policy = new RetryPolicy({ ...baseConfig, retryableErrors: ['Error'] });
    const operation = vi.fn().mockRejectedValue('plain string');

    const settled = policy.executeWithRetry(operation, 'op').catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const caught = (await settled) as MaxRetriesExceededError;

    expect(caught).toBeInstanceOf(MaxRetriesExceededError);
    expect(caught.lastError?.message).toBe('plain string');
  });

  describe('backoff', () => {
    async function collectDelays(config: RetryConfig): Promise<number[]> {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      const policy = new RetryPolicy(config);
      const operation = vi.fn().mockRejectedValue(new FlakyError());

      const settled = policy.executeWithRetry(operation, 'op').catch((e: unknown) => e);
      await vi.runAllTimersAsync();
      expect(await settled).toBeInstanceOf(MaxRetriesExceededError);

      const delays = setTimeoutSpy.mock.calls.map((call) => call[1] as number);
      setTimeoutSpy.mockRestore();
      return delays;
    }

    it('grows exponentially between attempts', async () => {
      const delays = await collectDelays({ ...baseConfig, maxAttempts: 4, maxDelayMs: 100000 });
      expect(delays).toEqual([100, 200, 400]);
    });

    it('is clamped to maxDelayMs', async () => {
      const delays = await collectDelays({ ...baseConfig, maxAttempts: 6, maxDelayMs: 300 });
      expect(delays).toEqual([100, 200, 300, 300, 300]);
    });

    it('keeps jitter within the configured percentage', async () => {
      const random = vi.spyOn(Math, 'random');
      const config = { ...baseConfig, maxAttempts: 3, maxDelayMs: 100000, jitterPercent: 20 };

      random.mockReturnValue(1); // +20%
      expect(await collectDelays(config)).toEqual([120, 240]);

      random.mockReturnValue(0); // -20%, never below baseDelayMs
      expect(await collectDelays(config)).toEqual([100, 160]);

      random.mockReturnValue(0.5); // no jitter
      expect(await collectDelays(config)).toEqual([100, 200]);
    });
  });

  describe('getConfig / updateConfig', () => {
    it('returns a frozen copy of the configuration', () => {
      const policy = new RetryPolicy(baseConfig);
      const config = policy.getConfig();

      expect(Object.isFrozen(config)).toBe(true);
      expect(config).toEqual(baseConfig);
      expect(config).not.toBe(baseConfig);
    });

    it('applies partial updates', () => {
      const policy = new RetryPolicy(baseConfig);
      policy.updateConfig({ maxAttempts: 9 });

      expect(policy.getConfig().maxAttempts).toBe(9);
      expect(policy.getConfig().baseDelayMs).toBe(100);
    });

    it('rebuilds the retryable set from a new retryableErrors list', async () => {
      const policy = new RetryPolicy(baseConfig);
      policy.updateConfig({ retryableErrors: ['FatalError'] });

      const fatal = vi
        .fn()
        .mockRejectedValueOnce(new FatalError())
        .mockResolvedValue('after retry');
      const promise = policy.executeWithRetry(fatal, 'op');
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toBe('after retry');
      expect(fatal).toHaveBeenCalledTimes(2);

      const flaky = vi.fn().mockRejectedValue(new FlakyError());
      await expect(policy.executeWithRetry(flaky, 'op')).rejects.toBeInstanceOf(FlakyError);
      expect(flaky).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the documented preset values', () => {
    expect(DEFAULT_RETRY_CONFIG).toMatchObject({ maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 8000 });
    expect(AGGRESSIVE_RETRY_CONFIG).toMatchObject({ maxAttempts: 5, baseDelayMs: 500, maxDelayMs: 10000 });
    expect(CONSERVATIVE_RETRY_CONFIG).toMatchObject({ maxAttempts: 2, baseDelayMs: 2000, maxDelayMs: 5000 });
  });
});
