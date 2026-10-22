import express from 'express';
import type { Redis } from 'ioredis';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/middleware/error-handler.ts';
import { rateLimit } from '../../src/middleware/rate-limit.ts';

const rule = { name: 'test', limit: 1, windowSeconds: 60, by: 'ip' as const };

describe('rateLimit when Redis is unavailable', () => {
  it('lets requests through immediately instead of failing them', async () => {
    const redis = { status: 'reconnecting', multi: vi.fn() } as unknown as Redis;
    const app = express()
      .get('/', rateLimit(redis, pino({ level: 'silent' }), rule), (_req, res) => {
        res.sendStatus(204);
      })
      .use(errorHandler);
    expect((await request(app).get('/')).status).toBe(204);
    expect((await request(app).get('/')).status).toBe(204);
    expect(redis.multi).not.toHaveBeenCalled();
  });
});
