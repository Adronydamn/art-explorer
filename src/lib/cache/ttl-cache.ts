type Entry<V> = { value: V; expiresAt: number };

export type TtlCacheOptions = {
  ttlMs: number;
  maxEntries?: number;
  now?: () => number;
};

/**
 * Small in-memory TTL cache with LRU eviction and in-flight request de-duplication.
 * Suitable for a single server instance; for multi-instance deployments put a shared cache
 * (e.g. a CDN or Redis) in front of it.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>();
  private readonly inflight = new Map<string, Promise<V>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor({ ttlMs, maxEntries = 500, now = Date.now }: TtlCacheOptions) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.now = now;
  }

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V, ttlMs = this.ttlMs): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
    this.inflight.clear();
  }

  /**
   * Returns a cached value or runs the loader once, sharing the pending promise between
   * concurrent callers. Failed loads are not cached.
   */
  async getOrLoad(
    key: string,
    loader: () => Promise<V>,
    options?: { ttlMs?: number; shouldCache?: (value: V) => boolean },
  ): Promise<V> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = loader()
      .then((value) => {
        if (options?.shouldCache?.(value) ?? true) this.set(key, value, options?.ttlMs);
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });
    this.inflight.set(key, promise);
    return promise;
  }
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
