import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AGGRESSIVE_CIRCUIT_BREAKER_CONFIG,
  CONSERVATIVE_CIRCUIT_BREAKER_CONFIG,
  CircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './circuit-breaker.js';

const KEY = 'op';

function fail(breaker: CircuitBreaker, times: number): void {
  for (let i = 0; i < times; i++) breaker.recordFailure(KEY);
}

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts closed', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
    expect(breaker.getState(KEY)).toBe('closed');
    expect(breaker.isOpen(KEY)).toBe(false);
  });

  it('opens after failureThreshold failures', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });

    fail(breaker, 2);
    expect(breaker.isOpen(KEY)).toBe(false);

    breaker.recordFailure(KEY);
    expect(breaker.getState(KEY)).toBe('open');
    expect(breaker.isOpen(KEY)).toBe(true);
  });

  it('keeps circuits independent per operation key', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
    breaker.recordFailure('a');

    expect(breaker.isOpen('a')).toBe(true);
    expect(breaker.isOpen('b')).toBe(false);
    expect(breaker.getAllStates()).toEqual({ a: 'open', b: 'closed' });
  });

  it('stays open until resetTimeoutMs elapses, then moves to half_open', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
    breaker.recordFailure(KEY);

    vi.advanceTimersByTime(999);
    expect(breaker.isOpen(KEY)).toBe(true);

    vi.advanceTimersByTime(1);
    expect(breaker.isOpen(KEY)).toBe(false);
    expect(breaker.getState(KEY)).toBe('half_open');
  });

  it('closes after halfOpenMaxAttempts successes in half_open', () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      halfOpenMaxAttempts: 2,
    });
    breaker.recordFailure(KEY);
    vi.advanceTimersByTime(1000);
    breaker.isOpen(KEY);

    breaker.recordSuccess(KEY);
    expect(breaker.getState(KEY)).toBe('half_open');

    breaker.recordSuccess(KEY);
    expect(breaker.getState(KEY)).toBe('closed');
    expect(breaker.getStatistics(KEY)).toMatchObject({ failureCount: 0, successCount: 0 });
  });

  it('closes after a single success in half_open by default', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
    breaker.recordFailure(KEY);
    vi.advanceTimersByTime(1000);
    breaker.isOpen(KEY);

    breaker.recordSuccess(KEY);
    expect(breaker.getState(KEY)).toBe('closed');
  });

  it('re-opens immediately on a failure in half_open', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 1000 });
    fail(breaker, 5);
    vi.advanceTimersByTime(1000);
    breaker.isOpen(KEY);
    expect(breaker.getState(KEY)).toBe('half_open');

    breaker.recordFailure(KEY);
    expect(breaker.getState(KEY)).toBe('open');
    expect(breaker.isOpen(KEY)).toBe(true);
  });

  it('resets the failure count on a success in closed', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });

    fail(breaker, 2);
    breaker.recordSuccess(KEY);
    expect(breaker.getStatistics(KEY).failureCount).toBe(0);

    fail(breaker, 2);
    expect(breaker.getState(KEY)).toBe('closed');
  });

  it('ignores a success received while open', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
    breaker.recordFailure(KEY);

    breaker.recordSuccess(KEY);
    expect(breaker.getState(KEY)).toBe('open');
  });

  it('reset() returns the circuit to closed and clears counters', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000 });
    fail(breaker, 2);

    breaker.reset(KEY);

    expect(breaker.getState(KEY)).toBe('closed');
    expect(breaker.isOpen(KEY)).toBe(false);
    expect(breaker.getStatistics(KEY)).toMatchObject({
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      timeSinceLastFailure: null,
    });
  });

  it('resetAll() closes every circuit', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
    breaker.recordFailure('a');
    breaker.recordFailure('b');

    breaker.resetAll();

    expect(breaker.getAllStates()).toEqual({ a: 'closed', b: 'closed' });
  });

  it('getStatistics() reports time since the last failure and state change', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 10000 });
    breaker.recordFailure(KEY);
    vi.advanceTimersByTime(250);

    expect(breaker.getStatistics(KEY)).toEqual({
      state: 'open',
      failureCount: 1,
      successCount: 0,
      timeSinceLastFailure: 250,
      timeSinceStateChange: 250,
    });
  });

  it('keeps the documented preset thresholds', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG).toEqual({
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      halfOpenMaxAttempts: 1,
    });
    expect(AGGRESSIVE_CIRCUIT_BREAKER_CONFIG).toEqual({
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      halfOpenMaxAttempts: 2,
    });
    expect(CONSERVATIVE_CIRCUIT_BREAKER_CONFIG).toEqual({
      failureThreshold: 10,
      resetTimeoutMs: 120000,
      halfOpenMaxAttempts: 1,
    });
  });
});
