import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Duration = `${number} ${"ms" | "s" | "m" | "h" | "d"}`;

/**
 * Rate limiting for API routes.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are configured (production / multi-instance), otherwise falls back to an
 * in-memory sliding window which is still effective on a single instance.
 */
const windowMs = (label: Duration): number => {
  const m = /^(\d+)\s*(s|m|h|d)$/.exec(label.trim());
  if (!m) return 60_000;
  const n = Number(m[1]);
  const unit = m[2];
  if (unit === "s") return n * 1000;
  if (unit === "m") return n * 60_000;
  if (unit === "h") return n * 3_600_000;
  return n * 86_400_000;
};

const inMemory = new Map<string, { count: number; resetAt: number }>();

function cleanupInMemory(now: number) {
  if (inMemory.size < 5000) return;
  for (const [key, entry] of inMemory) {
    if (entry.resetAt <= now) inMemory.delete(key);
  }
}

let upstash: Ratelimit | null = null;

export async function rateLimit(
  key: string,
  limit: number,
  windowLabel: Duration = "60 s",
): Promise<{ ok: boolean; remaining: number; reset: number }> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!upstash) {
      upstash = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(limit, windowLabel),
        prefix: "ante",
      });
    }
    const result = await upstash.limit(key);
    return {
      ok: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  const now = Date.now();
  let entry = inMemory.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs(windowLabel) };
    inMemory.set(key, entry);
    cleanupInMemory(now);
  }
  entry.count += 1;
  return {
    ok: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.resetAt,
  };
}