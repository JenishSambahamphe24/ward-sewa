import type { Redis } from 'ioredis';
import type { Logger } from 'pino';

export interface Cached<T> {
  value: T;
  hit: boolean;
}

// Cache-aside on Redis. Redis failures fall back to `load`: the cache speeds things up, it must
// never take an endpoint down.
export class RedisCache {
  readonly #redis: Redis;
  readonly #logger: Logger;

  constructor(redis: Redis, logger: Logger) {
    this.#redis = redis;
    this.#logger = logger;
  }

  async getOrLoad<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<Cached<T>> {
    const cached = await this.#redis.get(key).catch((err: Error) => this.#warn('get', key, err));
    if (cached) return { value: JSON.parse(cached) as T, hit: true };

    const value = await load();
    await this.#redis
      .set(key, JSON.stringify(value), 'EX', ttlSeconds)
      .catch((err: Error) => this.#warn('set', key, err));
    return { value, hit: false };
  }

  async invalidate(key: string): Promise<void> {
    await this.#redis.del(key).catch((err: Error) => this.#warn('del', key, err));
  }

  #warn(operation: string, key: string, err: Error): null {
    this.#logger.warn(
      { operation, key, err: err.message },
      'cache unavailable; using the database',
    );
    return null;
  }
}
