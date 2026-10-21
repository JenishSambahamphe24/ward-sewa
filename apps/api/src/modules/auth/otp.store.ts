import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { Redis } from 'ioredis';
import { AppError } from '../../lib/app-error.ts';

export const OTP_TTL_SECONDS = 300;
const MAX_REQUESTS = 3;
const REQUEST_WINDOW_SECONDS = 900;
const MAX_ATTEMPTS = 5;

const codeKey = (phone: string) => `otp:code:${phone}`;
const requestsKey = (phone: string) => `otp:requests:${phone}`;

export class OtpStore {
  readonly #redis: Redis;
  readonly #secret: string;

  constructor(redis: Redis, secret: string) {
    this.#redis = redis;
    this.#secret = secret;
  }

  async issue(phone: string): Promise<string> {
    // One MULTI: INCR can't race, and the window always gets an expiry even after a crash.
    const results = await this.#redis
      .multi()
      .incr(requestsKey(phone))
      .expire(requestsKey(phone), REQUEST_WINDOW_SECONDS, 'NX')
      .exec();
    const requests = Number(results?.[0]?.[1]);
    if (requests > MAX_REQUESTS) {
      const retryAfter = Math.max(await this.#redis.ttl(requestsKey(phone)), 1);
      throw new AppError(429, 'RATE_LIMITED', 'Too many codes requested; try again later', {
        headers: { 'Retry-After': String(retryAfter) },
      });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.#redis
      .multi()
      .hset(codeKey(phone), { hash: this.#hash(phone, code), attempts: 0 })
      .expire(codeKey(phone), OTP_TTL_SECONDS)
      .exec();
    return code;
  }

  async verify(phone: string, code: string): Promise<boolean> {
    const stored = await this.#redis.hget(codeKey(phone), 'hash');
    if (!stored) return false;

    if (this.#matches(stored, this.#hash(phone, code))) {
      // Only the request whose DEL removes the key wins, so a code works exactly once.
      return (await this.#redis.del(codeKey(phone))) === 1;
    }

    const attempts = await this.#redis.hincrby(codeKey(phone), 'attempts', 1);
    if (attempts >= MAX_ATTEMPTS) await this.#redis.del(codeKey(phone));
    return false;
  }

  // HMAC with a server secret: a leaked Redis dump can't be brute-forced over 10^6 codes.
  #hash(phone: string, code: string): string {
    return createHmac('sha256', this.#secret).update(`${phone}:${code}`).digest('hex');
  }

  #matches(a: string, b: string): boolean {
    return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
