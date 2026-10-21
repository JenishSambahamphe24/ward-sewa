import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { serviceTypes } from '../../src/db/schema/index.ts';
import { DivisionsSeed } from '../../src/db/seeds/divisions.seed.ts';
import { ServiceTypesSeed } from '../../src/db/seeds/service-types.seed.ts';
import { TestApp } from './support/test-app.ts';
import { TestDb } from './support/test-db.ts';
import { TestRedis } from './support/test-redis.ts';

const KATHMANDU = 'NP0327101';
const { pool, db } = TestDb.connect();
const redis = TestRedis.connect();
const app = TestApp.create(db, redis);

type Auth = Record<string, string>;
let ram: Auth;
let sita: Auth;
let relationshipId: number;
let lalitpurResidenceId: number;

const draft = () => ({
  serviceTypeId: relationshipId,
  localLevelCode: KATHMANDU,
  wardNo: 5,
  tole: 'Baneshwor',
  formData: { relativeName: 'Hari Bahadur Thapa' },
});
const create = (auth: Auth, body: object) =>
  request(app).post('/applications').set(auth).send(body);

beforeAll(async () => {
  await DivisionsSeed.run(db);
  await ServiceTypesSeed.run(db);
  const types = await db.select().from(serviceTypes);
  relationshipId =
    types.find((t) => t.localLevelCode === KATHMANDU && t.code === 'relationship')?.id ?? 0;
  lalitpurResidenceId =
    types.find((t) => t.localLevelCode === 'NP0325101' && t.code === 'residence')?.id ?? 0;
});
beforeEach(async () => {
  await redis.flushdb();
  await TestDb.reset(db);
  ram = (await TestApp.login(db, redis, { phone: '9841000001', name: 'Ram Thapa' })).auth;
  sita = (await TestApp.login(db, redis, { phone: '9841000002', name: 'Sita Rai' })).auth;
});
afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

describe('GET /service-types', () => {
  it('lists the active service types of a municipality, with the fee as a string', async () => {
    const res = await request(app).get(`/service-types?localLevel=${KATHMANDU}`);
    expect(res.status).toBe(200);
    expect(res.body.serviceTypes.map((t: { code: string }) => t.code)).toEqual([
      'residence',
      'relationship',
      'birth_date',
      'unmarried',
    ]);
    expect(res.body.serviceTypes[0].fee).toBe('100.00');
  });

  it('requires a valid local level code', async () => {
    expect((await request(app).get('/service-types?localLevel=KTM')).status).toBe(400);
  });
});

describe('PATCH /users/me', () => {
  it('sets the name the letter will carry', async () => {
    const res = await request(app)
      .patch('/users/me')
      .set(ram)
      .send({ name: '  Ram Bahadur Thapa ' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Ram Bahadur Thapa');
  });
});

describe('POST /applications', () => {
  it('creates a draft with a readable tracking number', async () => {
    const res = await create(ram, draft());
    expect(res.status).toBe(201);
    expect(res.body.application).toMatchObject({
      status: 'draft',
      version: 1,
      trackingNo: expect.stringMatching(/^WS-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/),
      serviceType: { code: 'relationship', fee: '200.00' },
      address: { localLevelCode: KATHMANDU, wardNo: 5, tole: 'Baneshwor', houseNo: null },
      formData: { relativeName: 'Hari Bahadur Thapa' },
    });
  });

  it('refuses a service type from another municipality', async () => {
    const res = await create(ram, { ...draft(), serviceTypeId: lalitpurResidenceId });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('This service is not offered there');
  });

  it('refuses a ward that does not exist', async () => {
    expect((await create(ram, { ...draft(), wardNo: 33 })).status).toBe(400);
  });

  it('refuses form fields the service type does not define', async () => {
    const res = await create(ram, { ...draft(), formData: { salary: '1000000' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('is for citizens only', async () => {
    const admin = await TestApp.login(db, redis, {
      phone: '9841000003',
      role: 'municipality_admin',
      localLevelCode: KATHMANDU,
    });
    expect((await create(admin.auth, draft())).status).toBe(403);
  });
});

describe('reading applications', () => {
  it('lists only my own applications, newest first, with paging', async () => {
    await create(ram, draft());
    await create(ram, { ...draft(), wardNo: 6 });
    await create(sita, draft());
    const res = await request(app).get('/applications?limit=1').set(ram);
    expect(res.body).toMatchObject({ page: 1, limit: 1, total: 2 });
    expect(res.body.items[0].address.wardNo).toBe(6);
  });

  it("returns 404 for someone else's application", async () => {
    const { id } = (await create(ram, draft())).body.application;
    expect((await request(app).get(`/applications/${id}`).set(ram)).status).toBe(200);
    expect((await request(app).get(`/applications/${id}`).set(sita)).status).toBe(404);
  });
});

describe('PATCH /applications/:id', () => {
  let id: number;
  beforeEach(async () => {
    id = (await create(ram, draft())).body.application.id;
  });
  const patch = (auth: Auth, body: object) =>
    request(app).patch(`/applications/${id}`).set(auth).send(body);

  it('merges form data and bumps the version', async () => {
    const res = await patch(ram, { version: 1, formData: { relation: 'Father' } });
    expect(res.status).toBe(200);
    expect(res.body.application).toMatchObject({
      version: 2,
      formData: { relativeName: 'Hari Bahadur Thapa', relation: 'Father' },
    });
  });

  it('rejects a stale version with 409 (optimistic locking)', async () => {
    expect((await patch(ram, { version: 1, tole: 'Koteshwor' })).status).toBe(200);
    const stale = await patch(ram, { version: 1, tole: 'Tinkune' });
    expect(stale.status).toBe(409);
    expect(stale.body.error.message).toMatch(/changed since you loaded it/);
  });

  it('lets exactly one of two simultaneous edits win', async () => {
    const results = await Promise.all([
      patch(ram, { version: 1, tole: 'A' }),
      patch(ram, { version: 1, tole: 'B' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it('does not let another citizen edit it', async () => {
    expect((await patch(sita, { version: 1, tole: 'X' })).status).toBe(404);
  });

  it('requires a version and at least one change', async () => {
    expect((await patch(ram, { tole: 'X' })).status).toBe(400);
    expect((await patch(ram, { version: 1 })).status).toBe(400);
  });
});
