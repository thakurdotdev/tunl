import type { RequestHandler } from "express";
import type { RedisClient } from "../redis/client.js";
import { redisKeys } from "../redis/keys.js";
import { AppError } from "./errors.js";

const incrementWithExpiry = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return count
`;

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; retryAfterSeconds: number }>;
}
export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: RedisClient) {}
  async increment(key: string, windowMs: number) {
    const count = Number(
      await this.redis.eval(incrementWithExpiry, { keys: [key], arguments: [String(windowMs)] }),
    );
    const ttlMs = await this.redis.pTTL(key);
    return {
      count,
      retryAfterSeconds: Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1_000)),
    };
  }
}

export function rateLimit(
  store: RateLimitStore,
  action: string,
  limit: number,
  windowMs: number,
): RequestHandler {
  return (req, res, next) => {
    store
      .increment(redisKeys.authRateLimit(action, req.ip ?? "unknown"), windowMs)
      .then(({ count, retryAfterSeconds }) => {
        if (count > limit) {
          res.setHeader("Retry-After", retryAfterSeconds);
          next(new AppError(429, "rate_limited", "Too many requests. Please try again later."));
          return;
        }
        next();
      })
      .catch(next);
  };
}
