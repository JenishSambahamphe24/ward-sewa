import { count, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { applications, serviceTypes } from '../../src/db/schema/index.ts';
import { DivisionsSeed } from '../../src/db/seeds/divisions.seed.ts';
import { ServiceTypesSeed } from '../../src/db/seeds/service-types.seed.ts';
import { TestApp } from './support/test-app.ts';
import { TestDb } from './support/test-db.ts';
import { TestRedis } from './support/test-redis.ts';

type Auth = Record<string, string>;
const KATHMANDU = 'NP0327101';
const { pool, db } = TestDb.connect();
const redis = TestRedis.connect();
const app = TestApp.create(db, redis);

let ram: Auth;
let sita: Auth;
let unmarriedId: number;
const body = (tole = 'Baneshwor') => ({
  serviceTypeId: unmarriedId,
  localLevelCode: KATHMANDU,
  wardNo: 5,
  tole,
});
const create = (auth: Auth, key: string | null, payload: object = body()) => {
  const req = request(app).post('/applications').set(auth);
  return (key ? req.set('Idempotency-Key', key) : req).send(payload);
};
const total = async () => (await db.select({ n: count() }).from(applications))[0]?.n;

beforeAll(async () => {
  await DivisionsSeed.run(db);
  await ServiceTypesSeed.run(db);
  const [type] = await db.select().from(serviceTypes).where(eq(serviceTypes.code, 'unmarried'));
  unmarriedId = type?.id ?? 0;
});
beforeEach(async () => {
  await redis.flushdb();
  await TestDb.reset(db);
  ram = (await TestApp.login(db, redis, { phone: '9841000001', name: 'Ram' })).auth;
  sita = (await TestApp.login(db, redis, { phone: '9841000002', name: 'Sita' })).auth;
});
afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

describe('POST /applications with an Idempotency-Key', () => {
  it('creates one application and replays it on retry', async () => {
    const first = await create(ram, 'form-7f3c-0001');
    const retry = await create(ram, 'form-7f3c-0001');
    expect(first.status).toBe(201);
    expect(retry.status).toBe(201);
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(retry.body.application.id).toBe(first.body.application.id);
    expect(await total()).toBe(1);
    expect(await redis.ttl(`idem:1:form-7f3c-0001`)).toBeGreaterThan(86_000);
  });

  it('creates exactly one application when retries race', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => create(ram, 'form-race-0001')),
    );
    expect(await total()).toBe(1);
    for (const res of results) expect([201, 409]).toContain(res.status);
    const ids = new Set(results.filter((r) => r.status === 201).map((r) => r.body.application.id));
    expect(ids.size).toBe(1);
  });

  it('rejects the same key with a different body', async () => {
    await create(ram, 'form-reuse-0001');
    const res = await create(ram, 'form-reuse-0001', body('Koteshwor'));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await total()).toBe(1);
  });

  it('creates separate applications for different keys, or with no key', async () => {
    await create(ram, 'form-a-00000001');
    await create(ram, 'form-b-00000001');
    await create(ram, null);
    await create(ram, null);
    expect(await total()).toBe(4);
  });

  it("keeps keys per user, so nobody receives someone else's application", async () => {
    const ramsApp = await create(ram, 'shared-key-0001');
    const sitasApp = await create(sita, 'shared-key-0001');
    expect(sitasApp.status).toBe(201);
    expect(sitasApp.headers['idempotent-replayed']).toBeUndefined();
    expect(sitasApp.body.application.id).not.toBe(ramsApp.body.application.id);
  });

  it('does not burn the key on a failed request, so the corrected retry works', async () => {
    const bad = await create(ram, 'form-fix-0001', { ...body(), wardNo: 33 });
    expect(bad.status).toBe(400);
    const fixed = await create(ram, 'form-fix-0001');
    expect(fixed.status).toBe(201);
    expect(await total()).toBe(1);
  });
});
