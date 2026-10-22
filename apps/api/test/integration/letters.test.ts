import { BsDateHelper } from '@ward-sewa/nepal-utils';
import { and, eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { serviceTypes, users, wards } from '../../src/db/schema/index.ts';
import { DivisionsSeed } from '../../src/db/seeds/divisions.seed.ts';
import { ServiceTypesSeed } from '../../src/db/seeds/service-types.seed.ts';
import { TestApp } from './support/test-app.ts';
import { TestDb } from './support/test-db.ts';
import { TestRedis } from './support/test-redis.ts';

type Auth = Record<string, string>;
const KATHMANDU = 'NP0327101';
const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');
const FISCAL_YEAR = BsDateHelper.fiscalYear(BsDateHelper.today()).label;
const { pool, db } = TestDb.connect();
const redis = TestRedis.connect();
const app = TestApp.create(db, redis);

let unmarriedId: number;
let wardIds: Record<number, number>;
let citizen: Auth;
interface Staff {
  secretary5: Auth;
  chair5: Auth;
  secretary7: Auth;
  chair7: Auth;
}
let staff: Staff;

const wardId = async (wardNo: number) => {
  const [ward] = await db
    .select({ id: wards.id })
    .from(wards)
    .where(and(eq(wards.localLevelCode, KATHMANDU), eq(wards.wardNo, wardNo)));
  return ward?.id ?? 0;
};

// Drives one application through the real API to `approved`: create v1, submit v2, review v3,
// approve v4 (uploads don't bump the version).
async function approved(wardNo = 5): Promise<number> {
  const { body } = await request(app)
    .post('/applications')
    .set(citizen)
    .send({ serviceTypeId: unmarriedId, localLevelCode: KATHMANDU, wardNo, tole: 'Baneshwor' });
  const id = body.application.id;
  await request(app)
    .post(`/applications/${id}/documents`)
    .set(citizen)
    .field('documentCode', 'citizenship')
    .attach('file', PDF, 'citizenship.pdf');
  await request(app).post(`/applications/${id}/submit`).set(citizen).send({ version: 1 });
  const move = (auth: Auth, version: number, to: string) =>
    request(app).post(`/staff/applications/${id}/transition`).set(auth).send({ to, version });
  await move(wardNo === 5 ? staff.secretary5 : staff.secretary7, 2, 'under_review');
  await move(wardNo === 5 ? staff.chair5 : staff.chair7, 3, 'approved');
  return id;
}

const issue = (auth: Auth, id: number, version = 4) =>
  request(app).post(`/staff/applications/${id}/issue`).set(auth).send({ version });

beforeAll(async () => {
  await DivisionsSeed.run(db);
  await ServiceTypesSeed.run(db);
  const types = await db.select().from(serviceTypes);
  unmarriedId =
    types.find((t) => t.localLevelCode === KATHMANDU && t.code === 'unmarried')?.id ?? 0;
  wardIds = { 5: await wardId(5), 7: await wardId(7) };
});
beforeEach(async () => {
  await redis.flushdb();
  await TestDb.reset(db);
  const login = async (values: Parameters<typeof TestApp.login>[2]) =>
    (await TestApp.login(db, redis, values)).auth;
  citizen = await login({ phone: '9841000001', name: 'Ram Thapa' });
  staff = {
    secretary5: await login({ phone: '9841000005', role: 'ward_secretary', wardId: wardIds[5] }),
    chair5: await login({ phone: '9841000006', role: 'ward_chair', wardId: wardIds[5] }),
    secretary7: await login({ phone: '9841000007', role: 'ward_secretary', wardId: wardIds[7] }),
    chair7: await login({ phone: '9841000008', role: 'ward_chair', wardId: wardIds[7] }),
  };
});
afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

describe('POST /staff/applications/:id/issue', () => {
  it('issues the first letter of the fiscal year with a frozen snapshot', async () => {
    const id = await approved();
    const res = await issue(staff.secretary5, id);
    expect(res.status).toBe(201);
    expect(res.body.letter).toMatchObject({
      letterNo: `${FISCAL_YEAR}-0001`,
      fiscalYear: FISCAL_YEAR,
      issuedDateBs: BsDateHelper.format(BsDateHelper.today()),
      verificationCode: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{10}$/),
      pdfReady: false,
      applicant: { name: 'Ram Thapa' },
      serviceType: { code: 'unmarried', nameNe: 'अविवाहित प्रमाणित' },
      address: {
        province: 'Bagmati',
        district: 'Kathmandu',
        localLevel: 'Kathmandu',
        wardNo: 5,
        tole: 'Baneshwor',
      },
    });

    const application = await request(app).get(`/applications/${id}`).set(citizen);
    expect(application.body.application.status).toBe('issued');
  });

  it('numbers letters per ward: 0001, 0002 in ward 5 and 0001 again in ward 7', async () => {
    const first = await issue(staff.chair5, await approved(5));
    const second = await issue(staff.chair5, await approved(5));
    const otherWard = await issue(staff.chair7, await approved(7));
    expect([first, second, otherWard].map((r) => r.body.letter.letterNo)).toEqual([
      `${FISCAL_YEAR}-0001`,
      `${FISCAL_YEAR}-0002`,
      `${FISCAL_YEAR}-0001`,
    ]);
  });

  it('gives 8 simultaneous issues in one ward 8 distinct, gap-free numbers', async () => {
    const ids: number[] = [];
    for (let i = 0; i < 8; i++) ids.push(await approved(5));
    const results = await Promise.all(ids.map((id) => issue(staff.secretary5, id)));
    expect(results.every((r) => r.status === 201)).toBe(true);
    const serials = results
      .map((r) => Number(r.body.letter.letterNo.slice(-4)))
      .sort((a, b) => a - b);
    expect(serials).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('issues one letter per application even if two requests race', async () => {
    const id = await approved();
    const results = await Promise.all([issue(staff.secretary5, id), issue(staff.chair5, id)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('does not leave a gap when an issue fails', async () => {
    const id = await approved();
    expect((await issue(staff.secretary5, id, 3)).status).toBe(409);
    expect((await issue(staff.secretary5, id)).body.letter.letterNo).toBe(`${FISCAL_YEAR}-0001`);
  });

  it('refuses an application that is still under review', async () => {
    const id = await approved();
    await db.execute(sql`UPDATE applications SET status = 'under_review' WHERE id = ${id}`);
    const res = await issue(staff.secretary5, id);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe(
      'Only approved applications can be issued, not under_review',
    );
  });

  it('only issues approved applications, from the right ward, by ward staff', async () => {
    const id = await approved();
    const draft = await request(app)
      .post('/applications')
      .set(citizen)
      .send({ serviceTypeId: unmarriedId, localLevelCode: KATHMANDU, wardNo: 5, tole: 'X' });
    expect((await issue(staff.secretary5, draft.body.application.id, 1)).status).toBe(404);
    expect((await issue(staff.chair7, id)).status).toBe(404);
    expect((await issue(citizen, id)).status).toBe(403);
  });
});

describe('the issued letter', () => {
  it('keeps the name it was issued with, even after the citizen renames themselves', async () => {
    const id = await approved();
    const { verificationCode } = (await issue(staff.secretary5, id)).body.letter;
    await db.update(users).set({ name: 'Someone Else' }).where(eq(users.phone, '9841000001'));

    const letter = await request(app).get(`/applications/${id}/letter`).set(citizen);
    expect(letter.body.letter.applicant.name).toBe('Ram Thapa');
    const verified = await request(app).get(`/verify/${verificationCode}`);
    expect(verified.body.applicantName).toBe('Ram Thapa');
  });

  it('is readable by the applicant and ward staff, and 404 before issuing', async () => {
    const id = await approved();
    expect((await request(app).get(`/applications/${id}/letter`).set(citizen)).status).toBe(404);
    await issue(staff.secretary5, id);
    expect((await request(app).get(`/applications/${id}/letter`).set(staff.chair5)).status).toBe(
      200,
    );
    expect((await request(app).get(`/applications/${id}/letter`).set(staff.chair7)).status).toBe(
      404,
    );
  });
});

describe('GET /verify/:code (public)', () => {
  it('confirms a genuine letter without login, revealing only what a verifier needs', async () => {
    const id = await approved();
    const { verificationCode, letterNo } = (await issue(staff.secretary5, id)).body.letter;
    const res = await request(app).get(`/verify/${verificationCode.toLowerCase()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      valid: true,
      letterNo,
      issuedDateBs: expect.any(String),
      applicantName: 'Ram Thapa',
      serviceType: {
        code: 'unmarried',
        nameEn: 'Unmarried verification',
        nameNe: 'अविवाहित प्रमाणित',
      },
      issuedBy: { localLevel: 'Kathmandu', wardNo: 5 },
    });
  });

  it('returns 404 for an unknown code and 400 for a malformed one', async () => {
    expect((await request(app).get('/verify/0000000000')).status).toBe(404);
    expect((await request(app).get('/verify/not-a-code')).status).toBe(400);
  });
});
