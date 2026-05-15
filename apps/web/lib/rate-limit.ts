import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;
let redisFallbackWarning = false;

function getRatelimit(): Ratelimit {
  if (ratelimit) return ratelimit;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: false,
    });
    return ratelimit;
  }

  // Fallback: try parsing REDIS_URL for Upstash REST
  const redisUrlRaw = process.env.REDIS_URL;
  if (redisUrlRaw && !redisFallbackWarning) {
    console.warn("[rate-limit] UPSTASH_REDIS_REST_URL not set — falling back to in-memory rate limiting (not suitable for production)");
    redisFallbackWarning = true;
  }

  // Return an in-memory fallback wrapped in the same interface
  const memoryMap = new Map<string, { count: number; resetAt: number }>();
  ratelimit = {
    limit: async (identifier: string) => {
      const now = Date.now();
      const entry = memoryMap.get(identifier);
      if (!entry || now > entry.resetAt) {
        memoryMap.set(identifier, { count: 1, resetAt: now + 60_000 });
        return { success: true, limit: 100, remaining: 99, reset: now + 60_000 };
      }
      entry.count++;
      return {
        success: entry.count <= 100,
        limit: 100,
        remaining: Math.max(0, 100 - entry.count),
        reset: entry.resetAt,
      };
    },
    blockUntilReady: async () => {},
  } as unknown as Ratelimit;

  return ratelimit;
}

export async function checkRateLimit(identifier: string): Promise<{
  allowed: boolean;
  remaining: number;
  reset: number;
}> {
  try {
    const rl = getRatelimit();
    const result = await rl.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch {
    // If Redis is down, allow the request (fail open for availability)
    return { allowed: true, remaining: 1, reset: Date.now() + 60_000 };
  }
}
