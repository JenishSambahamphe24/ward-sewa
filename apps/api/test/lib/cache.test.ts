import type { Redis } from 'ioredis';
import { pino } from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { RedisCache } from '../../src/lib/cache.ts';

const logger = pino({ level: 'silent' });
const fakeRedis = (overrides: Partial<Record<'get' | 'set' | 'del', unknown>>) =>
  ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    ...overrides,
  }) as unknown as Redis;

describe('RedisCache.getOrLoad', () => {
  it('loads and stores on a miss, with the TTL', async () => {
    const redis = fakeRedis({});
    const load = vi.fn().mockResolvedValue({ a: 1 });
    const result = await new RedisCache(redis, logger).getOrLoad('k', 600, load);
    expect(result).toEqual({ value: { a: 1 }, hit: false });
    expect(redis.set).toHaveBeenCalledWith('k', '{"a":1}', 'EX', 600);
  });

  it('serves a hit without loading', async () => {
    const load = vi.fn();
    const cache = new RedisCache(fakeRedis({ get: vi.fn().mockResolvedValue('{"a":1}') }), logger);
    expect(await cache.getOrLoad('k', 600, load)).toEqual({ value: { a: 1 }, hit: true });
    expect(load).not.toHaveBeenCalled();
  });

  it('falls back to the database when Redis is down', async () => {
    const down = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const cache = new RedisCache(fakeRedis({ get: down, set: down }), logger);
    const result = await cache.getOrLoad('k', 600, () => Promise.resolve('fresh'));
    expect(result).toEqual({ value: 'fresh', hit: false });
  });
});
