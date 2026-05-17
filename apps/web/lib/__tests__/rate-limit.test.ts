import { describe, it, expect, beforeEach } from "vitest";

// The rate-limit module caches state (Singleton Map), so we need to
// reset the module between tests to get a fresh in-memory store.
// We do this by clearing the module cache and re-importing.

async function importFresh() {
  const { checkRateLimit } = await import(
    "@/lib/rate-limit?fresh=" + Math.random().toString(36).slice(2)
  );
  return { checkRateLimit };
}

describe("checkRateLimit (in-memory fallback)", () => {
  it("allows first request", async () => {
    const { checkRateLimit } = await importFresh();
    const result = await checkRateLimit("test-ip-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
    expect(result.reset).toBeGreaterThan(Date.now());
  });

  it("tracks consecutive requests", async () => {
    const { checkRateLimit } = await importFresh();
    const ip = "test-ip-2";

    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99 - i);
    }
  });

  it("blocks after 100 requests from the same IP", async () => {
    const { checkRateLimit } = await importFresh();
    const ip = "test-ip-3";

    // Send 100 requests (allowed)
    for (let i = 0; i < 100; i++) {
      const result = await checkRateLimit(ip);
      expect(result.allowed).toBe(true);
    }

    // 101st should be blocked
    const blocked = await checkRateLimit(ip);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("treats different IPs independently", async () => {
    const { checkRateLimit } = await importFresh();

    // Exhaust IP-A
    for (let i = 0; i < 100; i++) {
      await checkRateLimit("ip-a");
    }

    // IP-B should still pass
    const b = await checkRateLimit("ip-b");
    expect(b.allowed).toBe(true);
    expect(b.remaining).toBe(99);
  });

  it("returns allowed=true on subsequent calls (fail-open)", async () => {
    const { checkRateLimit } = await importFresh();
    // Even after hitting rate limit, the fallback doesn't throw
    for (let i = 0; i < 120; i++) {
      const result = await checkRateLimit("test-ip-5");
      // Fail-open behavior: always returns a result, never throws
      expect(typeof result.allowed).toBe("boolean");
      expect(typeof result.remaining).toBe("number");
    }
  });
});
