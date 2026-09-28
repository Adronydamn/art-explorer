type Bucket = { tokens: number; updatedAt: number };

export type RateLimiterOptions = {
  /** Burst capacity. */
  capacity: number;
  /** Tokens refilled per second. */
  refillPerSecond: number;
  maxKeys?: number;
  now?: () => number;
};

/**
 * In-memory token bucket rate limiter for public proxy endpoints.
 * Per-instance only: behind several instances use a shared store or the platform's limiter.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly options: Required<RateLimiterOptions>;

  constructor(options: RateLimiterOptions) {
    this.options = { maxKeys: 10_000, now: Date.now, ...options };
  }

  /** Consumes one token. Returns retry-after seconds when limited, otherwise 0. */
  consume(key: string): { allowed: boolean; retryAfter: number } {
    const { capacity, refillPerSecond, maxKeys, now } = this.options;
    const time = now();
    const bucket = this.buckets.get(key) ?? { tokens: capacity, updatedAt: time };
    const elapsed = Math.max(0, time - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSecond);
    bucket.updatedAt = time;

    this.buckets.delete(key);
    this.buckets.set(key, bucket);
    if (this.buckets.size > maxKeys) {
      const oldest = this.buckets.keys().next().value;
      if (oldest !== undefined) this.buckets.delete(oldest);
    }

    if (bucket.tokens < 1) {
      return { allowed: false, retryAfter: Math.ceil((1 - bucket.tokens) / refillPerSecond) };
    }
    bucket.tokens -= 1;
    return { allowed: true, retryAfter: 0 };
  }
}

export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "anonymous";
}
