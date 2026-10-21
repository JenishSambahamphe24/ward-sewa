import { eq } from 'drizzle-orm';
import { pino } from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';
import { users } from '../../src/db/schema/index.ts';
import { DivisionsSeed } from '../../src/db/seeds/divisions.seed.ts';
import { TestDb } from './support/test-db.ts';
import { TestRedis } from './support/test-redis.ts';

const PHONE = '9841234567';
const { pool, db } = TestDb.connect();
const redis = TestRedis.connect();
const sent: { phone: string; message: string }[] = [];
const app = createApp({
  logger: pino({ level: 'silent' }),
  db,
  redis,
  sms: { send: async (phone, message) => void sent.push({ phone, message }) },
  authSecret: 'test-secret-test-secret-test-secret',
  healthChecks: {},
});

const lastCode = () => /\d{6}/.exec(sent.at(-1)?.message ?? '')?.[0] ?? '';
const requestCode = () => request(app).post('/auth/otp/request').send({ phone: PHONE });
const verify = (code: string) => request(app).post('/auth/otp/verify').send({ phone: PHONE, code });

async function login(): Promise<string> {
  await requestCode();
  return (await verify(lastCode())).body.token;
}

beforeAll(() => DivisionsSeed.run(db));
beforeEach(async () => {
  await redis.flushdb();
  await db.delete(users);
  sent.length = 0;
});
afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

describe('POST /auth/otp/request', () => {
  it('sends a 6-digit code that Redis expires after 5 minutes', async () => {
    const res = await requestCode();
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ expiresInSeconds: 300 });
    expect(sent).toEqual([{ phone: PHONE, message: expect.stringMatching(/\b\d{6}\b/) }]);

    const ttl = await redis.ttl(`otp:code:${PHONE}`);
    expect(ttl).toBeGreaterThan(290);
    expect(ttl).toBeLessThanOrEqual(300);
  });

  it('stores only an HMAC of the code, never the code itself', async () => {
    await requestCode();
    const stored = await redis.hget(`otp:code:${PHONE}`, 'hash');
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).not.toContain(lastCode());
  });

  it('allows 3 codes per 15 minutes, then 429 with Retry-After', async () => {
    for (let i = 0; i < 3; i++) expect((await requestCode()).status).toBe(202);
    const res = await requestCode();
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(850);
  });

  it('rejects a phone number that is not a Nepali mobile', async () => {
    const res = await request(app).post('/auth/otp/request').send({ phone: '01-4123456' });
    expect(res.status).toBe(400);
    expect(sent).toHaveLength(0);
  });
});

describe('POST /auth/otp/verify', () => {
  it('logs in, creating a citizen on first login', async () => {
    await requestCode();
    const res = await verify(lastCode());
    expect(res.status).toBe(200);
    expect(res.body.token).toMatch(/^[\w-]{43}$/);
    expect(res.body.user).toMatchObject({ phone: PHONE, role: 'citizen', wardId: null });
  });

  it('accepts a code only once', async () => {
    await requestCode();
    const code = lastCode();
    expect((await verify(code)).status).toBe(200);
    expect((await verify(code)).status).toBe(401);
  });

  it('burns the code after 5 wrong attempts', async () => {
    await requestCode();
    const code = lastCode();
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await verify(wrong)).status).toBe(401);
    expect((await verify(code)).status).toBe(401);
  });

  it('rejects an expired code', async () => {
    await requestCode();
    await redis.pexpire(`otp:code:${PHONE}`, 1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const res = await verify(lastCode());
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'UNAUTHENTICATED', message: 'Invalid or expired code' });
  });

  it('refuses a deactivated account', async () => {
    await db.insert(users).values({ phone: PHONE, isActive: false });
    await requestCode();
    const res = await verify(lastCode());
    expect(res.status).toBe(403);
    expect(res.body.token).toBeUndefined();
  });
});

describe('sessions', () => {
  it('returns the logged-in user from GET /auth/me', async () => {
    const token = await login();
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ phone: PHONE, role: 'citizen' });
  });

  it('keys sessions by a hash, so the raw token is not in Redis', async () => {
    const token = await login();
    const keys = await redis.keys('session:*');
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toContain(token);
  });

  it('ends the session on logout', async () => {
    const token = await login();
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app).post('/auth/logout').set(auth)).status).toBe(204);
    expect((await request(app).get('/auth/me').set(auth)).status).toBe(401);
  });

  it('locks out a deactivated user on their very next request', async () => {
    const token = await login();
    await db.update(users).set({ isActive: false }).where(eq(users.phone, PHONE));
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('sees a role change immediately', async () => {
    const token = await login();
    await db
      .update(users)
      .set({ role: 'municipality_admin', localLevelCode: 'NP0327101' })
      .where(eq(users.phone, PHONE));
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.body.user.role).toBe('municipality_admin');
  });
});
