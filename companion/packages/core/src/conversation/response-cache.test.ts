import { describe, expect, it } from 'vitest';
import { ResponseCache } from './response-cache.js';

describe('ResponseCache', () => {
  it('caches and retrieves responses', () => {
    const cache = new ResponseCache(10, 1000);
    cache.set('hello', 'Hi there!', 'System prompt');
    expect(cache.get('hello', 'System prompt')).toBe('Hi there!');
  });

  it('returns null for cache miss', () => {
    const cache = new ResponseCache(10, 1000);
    expect(cache.get('unknown', 'System prompt')).toBeNull();
  });

  it('normalizes keys (case-insensitive)', () => {
    const cache = new ResponseCache(10, 1000);
    cache.set('Hello World', 'Response', 'System');
    expect(cache.get('hello world', 'System')).toBe('Response');
  });

  it('evicts oldest entries when at capacity', () => {
    const cache = new ResponseCache(3, 1000);
    cache.set('a', 'A', 'System');
    cache.set('b', 'B', 'System');
    cache.set('c', 'C', 'System');
    cache.set('d', 'D', 'System'); // Should evict 'a'
    expect(cache.get('a', 'System')).toBeNull();
    expect(cache.get('b', 'System')).toBe('B');
    expect(cache.get('c', 'System')).toBe('C');
    expect(cache.get('d', 'System')).toBe('D');
  });

  it('expires entries after TTL', () => {
    const cache = new ResponseCache(10, 100); // 100ms TTL
    cache.set('test', 'Response', 'System');
    expect(cache.get('test', 'System')).toBe('Response');
    // Wait for expiration
    return new Promise(resolve => setTimeout(resolve, 150)).then(() => {
      expect(cache.get('test', 'System')).toBeNull();
    });
  });

  it('tracks hit count', () => {
    const cache = new ResponseCache(10, 1000);
    cache.set('test', 'Response', 'System');
    cache.get('test', 'System');
    cache.get('test', 'System');
    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
  });

  it('clears all entries', () => {
    const cache = new ResponseCache(10, 1000);
    cache.set('a', 'A', 'System');
    cache.set('b', 'B', 'System');
    cache.clear();
    expect(cache.get('a', 'System')).toBeNull();
    expect(cache.get('b', 'System')).toBeNull();
  });

  it('prunes expired entries', () => {
    const cache = new ResponseCache(10, 100);
    cache.set('a', 'A', 'System');
    cache.set('b', 'B', 'System');
    return new Promise(resolve => setTimeout(resolve, 150)).then(() => {
      cache.prune();
      expect(cache.getStats().size).toBe(0);
    });
  });

  it('evicts by byte-size budget', () => {
    // Small byte budget: 100 bytes
    const cache = new ResponseCache(100, 1000, 100);
    cache.set('a', 'A'.repeat(40), 'System');
    cache.set('b', 'B'.repeat(40), 'System');
    // Adding 'c' (40 bytes) would exceed 100 → evict oldest ('a')
    cache.set('c', 'C'.repeat(40), 'System');
    expect(cache.get('a', 'System')).toBeNull();
    expect(cache.get('b', 'System')).not.toBeNull();
    expect(cache.get('c', 'System')).not.toBeNull();
  });

  it('skips caching responses larger than the byte budget', () => {
    const cache = new ResponseCache(10, 1000, 50);
    cache.set('big', 'X'.repeat(100), 'System');
    expect(cache.get('big', 'System')).toBeNull();
  });

  it('tracks bytes in stats', () => {
    const cache = new ResponseCache(10, 1000, 1024);
    cache.set('a', 'Hello', 'System');
    const stats = cache.getStats();
    expect(stats.bytes).toBeGreaterThan(0);
  });

  it('updates byte count on overwrite', () => {
    const cache = new ResponseCache(10, 1000, 1024);
    cache.set('a', 'short', 'System');
    const before = cache.getStats().bytes;
    cache.set('a', 'a much longer response that takes more bytes', 'System');
    const after = cache.getStats().bytes;
    expect(after).toBeGreaterThan(before);
  });
});
