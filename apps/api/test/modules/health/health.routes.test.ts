import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.ts';
import type { HealthCheck } from '../../../src/modules/health/health.routes.ts';
import { UnitDeps } from '../../support/unit-deps.ts';

const up: HealthCheck = () => Promise.resolve();
const down: HealthCheck = () => Promise.reject(new Error('connection refused'));
const hangs: HealthCheck = () => new Promise(() => {});

const appWith = (healthChecks: Record<string, HealthCheck>) =>
  createApp(UnitDeps.create({ healthChecks, healthTimeoutMs: 50 }));

describe('GET /health/live', () => {
  it('is ok even when every dependency is down', async () => {
    const res = await request(appWith({ postgres: down })).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /health/ready', () => {
  it('returns 200 with per-dependency status and the BS date when all are up', async () => {
    const res = await request(appWith({ postgres: up, mongo: up, redis: up })).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.dateBs).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.dependencies.postgres).toEqual({ status: 'up', latencyMs: expect.any(Number) });
  });

  it('returns 503 and names the failing dependency', async () => {
    const res = await request(appWith({ postgres: up, redis: down })).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.dependencies.redis).toEqual({ status: 'down' });
    expect(res.body.dependencies.postgres.status).toBe('up');
  });

  it('treats a hanging dependency as down instead of hanging the request', async () => {
    const res = await request(appWith({ mongo: hangs })).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.dependencies.mongo).toEqual({ status: 'down' });
  });

  it('does not leak the underlying error message', async () => {
    const res = await request(appWith({ postgres: down })).get('/health/ready');
    expect(JSON.stringify(res.body)).not.toContain('connection refused');
  });
});
