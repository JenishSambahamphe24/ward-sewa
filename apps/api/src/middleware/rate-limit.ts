import type { RequestHandler } from 'express';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { AppError } from '../lib/app-error.ts';

export interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
  by: 'ip' | 'user';
}

export interface RateLimits {
  global: RateLimitRule;
  auth: RateLimitRule;
  verify: RateLimitRule;
  uploads: RateLimitRule;
}

export const DEFAULT_RATE_LIMITS: RateLimits = {
  global: { name: 'global', limit: 300, windowSeconds: 60, by: 'ip' },
  auth: { name: 'auth', limit: 20, windowSeconds: 900, by: 'ip' },
  verify: { name: 'verify', limit: 30, windowSeconds: 60, by: 'ip' },
  uploads: { name: 'uploads', limit: 30, windowSeconds: 600, by: 'user' },
};

// Fixed-window counter. Fails open: if Redis is unavailable the request goes through, because
// locking every citizen out is worse than briefly having no limit.
export function rateLimit(redis: Redis, logger: Logger, rule: RateLimitRule): RequestHandler {
  return async (req, res, next) => {
    if (redis.status !== 'ready') {
      logger.warn({ rule: rule.name }, 'rate limiter skipped: redis unavailable');
      return next();
    }
    const id = rule.by === 'user' && req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
    const key = `ratelimit:${rule.name}:${id}`;

    const results = await redis
      .multi()
      .incr(key)
      .expire(key, rule.windowSeconds, 'NX')
      .ttl(key)
      .exec()
      .catch((err: Error) => {
        logger.warn({ rule: rule.name, err: err.message }, 'rate limiter skipped: redis error');
        return null;
      });
    if (!results) return next();

    const count = Number(results[0]?.[1]);
    const resetSeconds = Math.max(Number(results[2]?.[1]), 1);
    res.set({
      'RateLimit-Limit': String(rule.limit),
      'RateLimit-Remaining': String(Math.max(rule.limit - count, 0)),
      'RateLimit-Reset': String(resetSeconds),
    });
    if (count > rule.limit) {
      throw new AppError(429, 'RATE_LIMITED', 'Too many requests; please wait and try again', {
        headers: { 'Retry-After': String(resetSeconds) },
      });
    }
    next();
  };
}
