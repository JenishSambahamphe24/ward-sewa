import express from 'express';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../../src/middleware/error-handler.ts';
import { requireAuth, requireRole } from '../../src/middleware/auth.ts';
import type { AuthService } from '../../src/modules/auth/auth.service.ts';
import type { User } from '../../src/modules/users/users.repository.ts';

const secretary = { id: 7, role: 'ward_secretary', isActive: true } as User;
const auth = {
  authenticate: (token: string) => Promise.resolve(token === 'good' ? secretary : null),
} as AuthService;

const app = express()
  .use(pinoHttp({ logger: pino({ level: 'silent' }) }))
  .get('/staff', requireAuth(auth), requireRole('ward_secretary', 'ward_chair'), (req, res) => {
    res.json({ id: req.user?.id });
  })
  .get('/chair', requireAuth(auth), requireRole('ward_chair'), (_req, res) => {
    res.sendStatus(204);
  })
  .use(errorHandler);

describe('requireAuth', () => {
  it.each([
    ['no header', undefined],
    ['a non-Bearer scheme', 'Basic good'],
    ['an unknown token', 'Bearer nope'],
  ])('returns 401 for %s', async (_case, header) => {
    const req = request(app).get('/staff');
    const res = await (header ? req.set('Authorization', header) : req);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('attaches the user for a valid token', async () => {
    const res = await request(app).get('/staff').set('Authorization', 'Bearer good');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 7 });
  });
});

describe('requireRole', () => {
  it('returns 403 when the role is not allowed', async () => {
    const res = await request(app).get('/chair').set('Authorization', 'Bearer good');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
