/**
 * Lightweight in-memory fixed-window rate limiter.
 *
 * Suitable for single-instance deployments and abuse smoothing. For multi-region
 * / horizontally-scaled deployments, back this with a shared store (e.g. Redis).
 */

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

export function rateLimit(
  key: string,
  { limit = 30, windowMs = 10_000 }: { limit?: number; windowMs?: number } = {}
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, limit, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
  return { ok: existing.count <= limit, limit, remaining, retryAfter };
}

/** Best-effort client identity from proxy headers, falling back to a shared key. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "anonymous";
}

/** Test/maintenance helper to clear all counters. */
export function resetRateLimits() {
  buckets.clear();
}
