import express from 'express';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '../../src/lib/app-error.ts';
import { errorHandler, notFound } from '../../src/middleware/error-handler.ts';

const appThrowing = (err: unknown) =>
  express()
    .use(pinoHttp({ logger: pino({ level: 'silent' }) }))
    .use(express.json())
    .post('/json', (_req, res) => {
      res.sendStatus(204);
    })
    .get('/boom', () => {
      throw err;
    })
    .use(notFound)
    .use(errorHandler);

describe('errorHandler', () => {
  it('turns a ZodError into 400 VALIDATION_FAILED with the issues as details', async () => {
    const parsed = z.object({ phone: z.string() }).safeParse({});
    const res = await request(appThrowing(parsed.error)).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details[0].path).toEqual(['phone']);
  });

  it('passes an AppError through unchanged', async () => {
    const res = await request(appThrowing(new AppError(404, 'NOT_FOUND', 'No such ward'))).get(
      '/boom',
    );
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'No such ward' } });
  });

  it('hides unexpected errors behind a generic 500', async () => {
    const res = await request(appThrowing(new Error('relation "users" does not exist'))).get(
      '/boom',
    );
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  });

  it.each([
    ['23505', 409, 'CONFLICT'],
    ['23503', 400, 'VALIDATION_FAILED'],
  ])(
    'maps PostgreSQL %s to %i %s without leaking the constraint',
    async (code, status, errorCode) => {
      const dbError = new Error('Failed query', {
        cause: { code, constraint: 'users_phone_unique' },
      });
      const res = await request(appThrowing(dbError)).get('/boom');
      expect(res.status).toBe(status);
      expect(res.body.error.code).toBe(errorCode);
      expect(JSON.stringify(res.body)).not.toContain('users_phone_unique');
    },
  );

  it('returns 400 MALFORMED_JSON for an unparseable body', async () => {
    const res = await request(appThrowing(null))
      .post('/json')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
  });
});

describe('notFound', () => {
  it('returns a consistent 404 body for unknown routes', async () => {
    const res = await request(appThrowing(null)).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'No route for GET /nope' } });
  });
});
