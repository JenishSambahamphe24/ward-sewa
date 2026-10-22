import express from 'express';
import type { Redis } from 'ioredis';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/middleware/error-handler.ts';
import { idempotent } from '../../src/middleware/idempotency.ts';

const appWith = (redis: Redis) =>
  express()
    .use(express.json())
    .post('/', idempotent(redis, pino({ level: 'silent' })), (_req, res) => {
      res.status(201).json({ ok: true });
    })
    .use(errorHandler);

describe('idempotent', () => {
  it('rejects a malformed key', async () => {
    const res = await request(appWith({ status: 'ready' } as Redis))
      .post('/')
      .set('Idempotency-Key', 'short');
    expect(res.status).toBe(400);
  });

  it('passes through without the guarantee when Redis is unavailable', async () => {
    const redis = { status: 'reconnecting', set: vi.fn() } as unknown as Redis;
    const res = await request(appWith(redis)).post('/').set('Idempotency-Key', 'abcd-1234-efgh');
    expect(res.status).toBe(201);
    expect(redis.set).not.toHaveBeenCalled();
  });
});
