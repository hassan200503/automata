/**
 * Response Cache
 *
 * Caches common responses to reduce latency and provider load.
 * Uses LRU eviction with configurable TTL and byte-size cap.
 */

export interface CacheEntry {
  response: string;
  timestamp: number;
  hitCount: number;
}

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB total cache budget

export class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly maxBytes: number;
  private currentBytes = 0;

  constructor(maxEntries = 100, ttlMs = 5 * 60 * 1000, maxBytes = DEFAULT_MAX_BYTES) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.maxBytes = maxBytes;
  }

  /**
   * Estimate the byte size of a string (UTF-16 chars ≈ 2 bytes, ASCII ≈ 1).
   * Uses Buffer.byteLength when available for accuracy, falls back to length*2.
   */
  private byteSize(s: string): number {
    try {
      return Buffer.byteLength(s, 'utf8');
    } catch {
      return s.length * 2;
    }
  }

  /**
   * Generate cache key from conversation context
   */
  private generateKey(userMessage: string, systemPrompt?: string): string {
    const normalized = userMessage.toLowerCase().trim();
    const system = systemPrompt ? systemPrompt.slice(0, 100) : '';
    return `${system}:${normalized}`;
  }

  /**
   * Get cached response if available and not expired
   */
  get(userMessage: string, systemPrompt?: string): string | null {
    const key = this.generateKey(userMessage, systemPrompt);
    const entry = this.cache.get(key);

    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > this.ttlMs) {
      this.removeEntry(key);
      return null;
    }

    entry.hitCount++;
    return entry.response;
  }

  private removeEntry(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentBytes -= this.byteSize(entry.response);
      this.cache.delete(key);
    }
  }

  /**
   * Store response in cache
   */
  set(userMessage: string, response: string, systemPrompt?: string): void {
    const key = this.generateKey(userMessage, systemPrompt);
    const responseBytes = this.byteSize(response);

    // If a single response exceeds the byte budget, don't cache it
    if (responseBytes > this.maxBytes) return;

    // Remove existing entry if updating
    if (this.cache.has(key)) {
      this.removeEntry(key);
    }

    // Evict by LRU (oldest timestamp) until under both count and byte limits
    while (
      (this.cache.size >= this.maxEntries || this.currentBytes + responseBytes > this.maxBytes) &&
      this.cache.size > 0
    ) {
      let oldestKey: string | null = null;
      let oldestTimestamp = Infinity;

      for (const [k, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.removeEntry(oldestKey);
      } else {
        break;
      }
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hitCount: 0,
    });
    this.currentBytes += responseBytes;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.currentBytes = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hits: number; entries: number; bytes: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
    }

    return {
      size: this.cache.size,
      hits: totalHits,
      entries: this.cache.size,
      bytes: this.currentBytes,
    };
  }

  /**
   * Remove expired entries
   */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.removeEntry(key);
      }
    }
  }
}
