import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, resetRateLimits, clientKey } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows requests under the limit and decrements remaining", () => {
    const first = rateLimit("k", { limit: 2, windowMs: 1000 });
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(1);

    const second = rateLimit("k", { limit: 2, windowMs: 1000 });
    expect(second.ok).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks once the limit is exceeded and reports retryAfter", () => {
    rateLimit("k", { limit: 1, windowMs: 5000 });
    const blocked = rateLimit("k", { limit: 1, windowMs: 5000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    rateLimit("a", { limit: 1, windowMs: 5000 });
    const b = rateLimit("b", { limit: 1, windowMs: 5000 });
    expect(b.ok).toBe(true);
  });
});

describe("clientKey", () => {
  it("uses the first hop of x-forwarded-for", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip then anonymous", () => {
    expect(clientKey(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientKey(new Headers())).toBe("anonymous");
  });
});
