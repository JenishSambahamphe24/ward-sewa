import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { users } from '../../src/db/schema/index.ts';
import { DivisionsSeed } from '../../src/db/seeds/divisions.seed.ts';
import { SessionStore } from '../../src/modules/auth/session.store.ts';
import { TestApp } from './support/test-app.ts';
import { TestDb } from './support/test-db.ts';
import { TestRedis } from './support/test-redis.ts';

const KATHMANDU = 'NP0327101';
const LALITPUR = 'NP0325101';
const { pool, db } = TestDb.connect();
const redis = TestRedis.connect();
const sessions = new SessionStore(redis);
const app = TestApp.create(db, redis);

async function tokenFor(values: typeof users.$inferInsert): Promise<string> {
  const [user] = await db.insert(users).values(values).returning();
  return sessions.create(user?.id ?? 0);
}

let ktmAdmin: string;
let lalitpurAdmin: string;
const as = (token: string) => ({ Authorization: `Bearer ${token}` });
const assign = (token: string, body: object) =>
  request(app).post('/admin/staff').set(as(token)).send(body);
const update = (token: string, id: number, body: object) =>
  request(app).patch(`/admin/staff/${id}`).set(as(token)).send(body);
const secretary = { phone: '9841000101', name: 'Ram Thapa', role: 'ward_secretary', wardNo: 5 };

beforeAll(() => DivisionsSeed.run(db));
beforeEach(async () => {
  await redis.flushdb();
  await TestDb.reset(db);
  ktmAdmin = await tokenFor({
    phone: '9841000001',
    role: 'municipality_admin',
    localLevelCode: KATHMANDU,
  });
  lalitpurAdmin = await tokenFor({
    phone: '9841000002',
    role: 'municipality_admin',
    localLevelCode: LALITPUR,
  });
});
afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

describe('access', () => {
  it('is limited to municipality admins', async () => {
    const citizen = await tokenFor({ phone: '9841000003' });
    expect((await request(app).get('/admin/staff').set(as(citizen))).status).toBe(403);
    expect((await request(app).get('/admin/staff')).status).toBe(401);
  });
});

describe('POST /admin/staff', () => {
  it('creates a secretary in a ward of the admin’s municipality', async () => {
    const res = await assign(ktmAdmin, secretary);
    expect(res.status).toBe(201);
    expect(res.body.staff).toMatchObject({
      phone: '9841000101',
      name: 'Ram Thapa',
      role: 'ward_secretary',
      isActive: true,
      ward: { wardNo: 5 },
    });
  });

  it('promotes an existing citizen account', async () => {
    await db.insert(users).values({ phone: secretary.phone });
    const res = await assign(ktmAdmin, secretary);
    expect(res.status).toBe(201);
    expect(res.body.staff.role).toBe('ward_secretary');
  });

  it('refuses a phone that belongs to another admin', async () => {
    const res = await assign(ktmAdmin, { ...secretary, phone: '9841000002' });
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ reason: 'phone_is_staff' });
  });

  it('refuses a ward that does not exist in the municipality', async () => {
    const res = await assign(ktmAdmin, { ...secretary, wardNo: 33 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Ward 33 does not exist here');
  });

  it('allows only one active chair per ward', async () => {
    const chair = { ...secretary, role: 'ward_chair' };
    expect((await assign(ktmAdmin, chair)).status).toBe(201);
    const res = await assign(ktmAdmin, { ...chair, phone: '9841000102' });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Ward 5 already has an active chair');
    expect(res.body.error.details).toEqual({ reason: 'ward_has_chair' });
  });
});

describe('GET /admin/staff', () => {
  beforeEach(async () => {
    await assign(ktmAdmin, secretary);
    await assign(ktmAdmin, { ...secretary, phone: '9841000102', role: 'ward_chair', wardNo: 6 });
    await assign(lalitpurAdmin, { ...secretary, phone: '9841000201' });
  });

  it('lists only the admin’s own municipality', async () => {
    const res = await request(app).get('/admin/staff').set(as(ktmAdmin));
    expect(res.body.staff.map((s: { phone: string }) => s.phone)).toEqual([
      '9841000101',
      '9841000102',
    ]);
  });

  it('filters by role and ward', async () => {
    const byRole = await request(app).get('/admin/staff?role=ward_chair').set(as(ktmAdmin));
    expect(byRole.body.staff).toHaveLength(1);
    const byWard = await request(app).get('/admin/staff?wardNo=5').set(as(ktmAdmin));
    expect(byWard.body.staff[0].phone).toBe('9841000101');
  });
});

describe('PATCH /admin/staff/:id', () => {
  let staffId: number;
  beforeEach(async () => {
    staffId = (await assign(ktmAdmin, secretary)).body.staff.id;
  });

  it('moves staff to another ward and switches their role', async () => {
    const res = await update(ktmAdmin, staffId, { wardNo: 6, role: 'ward_chair' });
    expect(res.status).toBe(200);
    expect(res.body.staff).toMatchObject({ role: 'ward_chair', ward: { wardNo: 6 } });
  });

  it('refuses to make someone chair of a ward that already has one', async () => {
    await assign(ktmAdmin, { ...secretary, phone: '9841000102', role: 'ward_chair', wardNo: 6 });
    const res = await update(ktmAdmin, staffId, { role: 'ward_chair', wardNo: 6 });
    expect(res.status).toBe(409);
  });

  it('hides other municipalities’ staff behind a 404', async () => {
    expect((await update(lalitpurAdmin, staffId, { isActive: false })).status).toBe(404);
  });

  it('cannot target an admin, including the admin themself', async () => {
    const [admin] = await db.select().from(users).where(eq(users.phone, '9841000001'));
    expect((await update(ktmAdmin, admin?.id ?? 0, { isActive: false })).status).toBe(404);
  });

  it('rejects an empty change', async () => {
    expect((await update(ktmAdmin, staffId, {})).status).toBe(400);
  });

  it('deactivates staff, locking them out on their next request', async () => {
    const staffToken = await sessions.create(staffId);
    expect((await request(app).get('/auth/me').set(as(staffToken))).status).toBe(200);

    const res = await update(ktmAdmin, staffId, { isActive: false });
    expect(res.body.staff.isActive).toBe(false);
    expect((await request(app).get('/auth/me').set(as(staffToken))).status).toBe(401);
  });
});
