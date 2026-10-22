import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { RateLimits } from '../../src/middleware/rate-limit.ts';
import { TestApp } from './support/test-app.ts';
import { TestDb } from './support/test-db.ts';
import { TestRedis } from './support/test-redis.ts';

const { pool, db } = TestDb.connect();
const redis = TestRedis.connect();

const limits: RateLimits = {
  global: { name: 'global', limit: 100, windowSeconds: 60, by: 'ip' },
  auth: { name: 'auth', limit: 3, windowSeconds: 60, by: 'ip' },
  verify: { name: 'verify', limit: 3, windowSeconds: 1, by: 'ip' },
  uploads: { name: 'uploads', limit: 2, windowSeconds: 60, by: 'user' },
};
const app = TestApp.create(db, redis, { rateLimits: limits });
const proxied = TestApp.create(db, redis, { rateLimits: limits, trustProxy: 1 });
const verify = (target = app, ip?: string) => {
  const req = request(target).get('/verify/0000000000');
  return ip ? req.set('X-Forwarded-For', ip) : req;
};

beforeEach(async () => {
  await redis.flushdb();
  await TestDb.reset(db);
});
afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

describe('rate limiting', () => {
  it('counts down in RateLimit-* headers, then answers 429 with Retry-After', async () => {
    const statuses = [];
    for (let i = 0; i < 3; i++) {
      const res = await verify();
      statuses.push(res.status);
      expect(res.headers['ratelimit-limit']).toBe('3');
      expect(res.headers['ratelimit-remaining']).toBe(String(2 - i));
    }
    expect(statuses).toEqual([404, 404, 404]);

    const blocked = await verify();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThanOrEqual(1);
  });

  it('opens again when the window ends', async () => {
    for (let i = 0; i < 4; i++) await verify();
    expect((await verify()).status).toBe(429);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect((await verify()).status).toBe(404);
  });

  it('limits OTP requests per IP across different phone numbers', async () => {
    const otp = (phone: string) => request(app).post('/auth/otp/request').send({ phone });
    for (const phone of ['9841000001', '9841000002', '9841000003']) {
      expect((await otp(phone)).status).toBe(202);
    }
    expect((await otp('9841000004')).status).toBe(429);
  });

  it('counts each real client separately behind a trusted proxy', async () => {
    for (let i = 0; i < 3; i++) await verify(proxied, '203.0.113.1');
    expect((await verify(proxied, '203.0.113.1')).status).toBe(429);
    expect((await verify(proxied, '203.0.113.2')).status).toBe(404);
  });

  it('ignores a forged X-Forwarded-For when no proxy is trusted', async () => {
    for (let i = 0; i < 3; i++) await verify(app, `198.51.100.${i}`);
    expect((await verify(app, '198.51.100.99')).status).toBe(429);
  });

  it('limits uploads per user, not per IP', async () => {
    const ram = (await TestApp.login(db, redis, { phone: '9841000001', name: 'Ram' })).auth;
    const sita = (await TestApp.login(db, redis, { phone: '9841000002', name: 'Sita' })).auth;
    const upload = (auth: Record<string, string>) =>
      request(app).post('/applications/999/documents').set(auth).field('documentCode', 'x');
    for (let i = 0; i < 2; i++) expect((await upload(ram)).status).not.toBe(429);
    expect((await upload(ram)).status).toBe(429);
    expect((await upload(sita)).status).not.toBe(429);
  });

  it('never throttles health checks', async () => {
    const strict = TestApp.create(db, redis, {
      rateLimits: { ...limits, global: { ...limits.global, limit: 1 } },
    });
    for (let i = 0; i < 5; i++) {
      expect((await request(strict).get('/health/live')).status).toBe(200);
    }
    await request(strict).get('/verify/0000000000');
    expect((await request(strict).get('/verify/0000000000')).status).toBe(429);
  });
});
