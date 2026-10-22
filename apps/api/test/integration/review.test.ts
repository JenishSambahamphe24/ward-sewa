import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { serviceTypes, wards } from '../../src/db/schema/index.ts';
import { DivisionsSeed } from '../../src/db/seeds/divisions.seed.ts';
import { ServiceTypesSeed } from '../../src/db/seeds/service-types.seed.ts';
import { TestApp } from './support/test-app.ts';
import { TestDb } from './support/test-db.ts';
import { TestRedis } from './support/test-redis.ts';

type Auth = Record<string, string>;
const KATHMANDU = 'NP0327101';
const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');
const { pool, db } = TestDb.connect();
const redis = TestRedis.connect();
const app = TestApp.create(db, redis);

let relationshipId: number;
let wardIds: Record<number, number>;
let citizen: Auth;
let secretary5: Auth;
let chair5: Auth;
let secretary7: Auth;
let chair7: Auth;
let admin: Auth;
let applicationId: number;

const wardId = async (wardNo: number) => {
  const [ward] = await db
    .select({ id: wards.id })
    .from(wards)
    .where(and(eq(wards.localLevelCode, KATHMANDU), eq(wards.wardNo, wardNo)));
  return ward?.id ?? 0;
};

async function draft(auth: Auth, wardNo = 5): Promise<number> {
  const res = await request(app)
    .post('/applications')
    .set(auth)
    .send({
      serviceTypeId: relationshipId,
      localLevelCode: KATHMANDU,
      wardNo,
      tole: 'Baneshwor',
      formData: { relativeName: 'Hari Bahadur Thapa', relation: 'Father' },
    });
  return res.body.application.id;
}

async function submitted(auth: Auth, wardNo = 5): Promise<number> {
  const id = await draft(auth, wardNo);
  for (const documentCode of ['citizenship', 'relative_citizenship']) {
    await request(app)
      .post(`/applications/${id}/documents`)
      .set(auth)
      .field('documentCode', documentCode)
      .attach('file', PDF, `${documentCode}.pdf`);
  }
  await request(app).post(`/applications/${id}/submit`).set(auth).send({ version: 1 });
  return id;
}

const move = (auth: Auth, version: number, to: string, note?: string) =>
  request(app)
    .post(`/staff/applications/${applicationId}/transition`)
    .set(auth)
    .send({ to, version, note });

beforeAll(async () => {
  await DivisionsSeed.run(db);
  await ServiceTypesSeed.run(db);
  const types = await db.select().from(serviceTypes);
  relationshipId =
    types.find((t) => t.localLevelCode === KATHMANDU && t.code === 'relationship')?.id ?? 0;
  wardIds = { 5: await wardId(5), 7: await wardId(7) };
});
beforeEach(async () => {
  await redis.flushdb();
  await TestDb.reset(db);
  const login = async (values: Parameters<typeof TestApp.login>[2]) =>
    (await TestApp.login(db, redis, values)).auth;
  citizen = await login({ phone: '9841000001', name: 'Ram Thapa' });
  secretary5 = await login({ phone: '9841000005', role: 'ward_secretary', wardId: wardIds[5] });
  chair5 = await login({ phone: '9841000006', role: 'ward_chair', wardId: wardIds[5] });
  secretary7 = await login({ phone: '9841000007', role: 'ward_secretary', wardId: wardIds[7] });
  chair7 = await login({ phone: '9841000008', role: 'ward_chair', wardId: wardIds[7] });
  admin = await login({
    phone: '9841000009',
    role: 'municipality_admin',
    localLevelCode: KATHMANDU,
  });
  applicationId = await submitted(citizen);
});
afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

describe('GET /staff/applications', () => {
  it("shows the ward's submitted applications, oldest first, never drafts", async () => {
    await draft(citizen);
    const later = await submitted(citizen);
    const res = await request(app).get('/staff/applications').set(secretary5);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((a: { id: number }) => a.id)).toEqual([applicationId, later]);
    expect(res.body.items[0].applicant).toMatchObject({ name: 'Ram Thapa', phone: '9841000001' });
  });

  it("does not show another ward's applications", async () => {
    const res = await request(app).get('/staff/applications').set(secretary7);
    expect(res.body).toMatchObject({ items: [], total: 0 });
  });

  it('filters by status', async () => {
    await move(secretary5, 2, 'under_review');
    const res = await request(app).get('/staff/applications?status=submitted').set(secretary5);
    expect(res.body.total).toBe(0);
  });

  it('is for ward staff only, not the municipality admin or citizens', async () => {
    expect((await request(app).get('/staff/applications').set(admin)).status).toBe(403);
    expect((await request(app).get('/staff/applications').set(citizen)).status).toBe(403);
  });
});

describe('reading one application as staff', () => {
  it("lets the ward's staff read it, its documents and its history; others get 404", async () => {
    const paths = [
      `/staff/applications/${applicationId}`,
      `/applications/${applicationId}/documents`,
      `/applications/${applicationId}/history`,
    ];
    for (const path of paths) {
      expect((await request(app).get(path).set(secretary5)).status).toBe(200);
      expect((await request(app).get(path).set(secretary7)).status).toBe(404);
    }

    const [document] = (
      await request(app)
        .get(paths[1] ?? '')
        .set(chair5)
    ).body.documents;
    const file = await request(app)
      .get(`/applications/${applicationId}/documents/${document.id}/file`)
      .set(chair5)
      .buffer(true);
    expect(Buffer.from(file.body).equals(PDF)).toBe(true);
  });
});

describe('POST /staff/applications/:id/transition', () => {
  it('runs the happy path and records who did what', async () => {
    expect((await move(secretary5, 2, 'under_review')).body.application.status).toBe(
      'under_review',
    );
    const approved = await move(chair5, 3, 'approved', 'Verified in person');
    expect(approved.status).toBe(200);
    expect(approved.body.application).toMatchObject({ status: 'approved', version: 4 });

    const history = await request(app).get(`/applications/${applicationId}/history`).set(citizen);
    expect(history.body.history.map((h: { toStatus: string }) => h.toStatus)).toEqual([
      'draft',
      'submitted',
      'under_review',
      'approved',
    ]);
    expect(history.body.history[3].note).toBe('Verified in person');
  });

  it('lets only the chair approve and only the secretary start review', async () => {
    expect((await move(chair5, 2, 'under_review')).status).toBe(403);
    await move(secretary5, 2, 'under_review');
    const res = await move(secretary5, 3, 'approved');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe("A ward_secretary can't move an application to approved");
  });

  it('refuses a step the workflow does not allow', async () => {
    const res = await move(chair5, 2, 'approved');
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Can't move from submitted to approved");
  });

  it("stops another ward's chair at 404", async () => {
    await move(secretary5, 2, 'under_review');
    expect((await move(chair7, 3, 'approved')).status).toBe(404);
  });

  it('keeps the municipality admin out of approvals', async () => {
    await move(secretary5, 2, 'under_review');
    expect((await move(admin, 3, 'approved')).status).toBe(403);
  });

  it('requires a reason to reject or ask for more information', async () => {
    await move(secretary5, 2, 'under_review');
    expect((await move(secretary5, 3, 'rejected')).status).toBe(400);
    expect((await move(secretary5, 3, 'needs_info')).status).toBe(400);
  });

  it('sends it back to the citizen, who fixes it and resubmits', async () => {
    await move(secretary5, 2, 'under_review');
    await move(secretary5, 3, 'needs_info', 'Citizenship scan is unreadable');

    const history = await request(app).get(`/applications/${applicationId}/history`).set(citizen);
    expect(history.body.history.at(-1)).toMatchObject({
      toStatus: 'needs_info',
      note: 'Citizenship scan is unreadable',
    });

    await request(app)
      .post(`/applications/${applicationId}/documents`)
      .set(citizen)
      .field('documentCode', 'citizenship')
      .attach('file', PDF, 'clearer.pdf');
    const resubmit = await request(app)
      .post(`/applications/${applicationId}/submit`)
      .set(citizen)
      .send({ version: 4 });
    expect(resubmit.status).toBe(200);
    expect(resubmit.body.application.status).toBe('submitted');
  });

  it('rejects a stale version', async () => {
    await move(secretary5, 2, 'under_review');
    expect((await move(chair5, 2, 'approved')).status).toBe(409);
  });

  it('lets exactly one of two simultaneous approvals win', async () => {
    await move(secretary5, 2, 'under_review');
    const results = await Promise.all([move(chair5, 3, 'approved'), move(chair5, 3, 'approved')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);

    const history = await request(app).get(`/applications/${applicationId}/history`).set(chair5);
    const approvals = history.body.history.filter(
      (h: { toStatus: string }) => h.toStatus === 'approved',
    );
    expect(approvals).toHaveLength(1);
  });
});
