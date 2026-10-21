import { Redis } from 'ioredis';

export class TestRedis {
  static readonly url = process.env.TEST_REDIS_URL ?? 'redis://localhost:6380/15';

  // Tests flush this database, so only a dedicated index is allowed.
  static connect(): Redis {
    if (!TestRedis.url.endsWith('/15')) throw new Error('TEST_REDIS_URL must use database 15');
    return new Redis(TestRedis.url, { maxRetriesPerRequest: 1 });
  }
}
