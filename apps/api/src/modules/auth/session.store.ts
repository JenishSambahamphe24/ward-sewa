import { createHash, randomBytes } from 'node:crypto';
import type { Redis } from 'ioredis';

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

// Keys hold a hash of the token, so a Redis dump doesn't hand out working sessions.
const sessionKey = (token: string) => `session:${createHash('sha256').update(token).digest('hex')}`;

export class SessionStore {
  readonly #redis: Redis;

  constructor(redis: Redis) {
    this.#redis = redis;
  }

  async create(userId: number): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.#redis.set(sessionKey(token), String(userId), 'EX', SESSION_TTL_SECONDS);
    return token;
  }

  async findUserId(token: string): Promise<number | null> {
    const userId = await this.#redis.get(sessionKey(token));
    return userId ? Number(userId) : null;
  }

  async destroy(token: string): Promise<void> {
    await this.#redis.del(sessionKey(token));
  }
}
