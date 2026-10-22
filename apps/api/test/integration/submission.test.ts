import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { serviceTypes } from '../../src/db/schema/index.ts';
import { DivisionsSeed } from '../../src/db/seeds/divisions.seed.ts';
import { ServiceTypesSeed } from '../../src/db/seeds/service-types.seed.ts';
import { TestApp } from './support/test-app.ts';
import { TestDb } from './support/test-db.ts';
import { TestRedis } from './support/test-redis.ts';

type Auth = Record<string, string>;
const KATHMANDU = 'NP0327101';
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\n%%EOF\n');
const { pool, db } = TestDb.connect();
const redis = TestRedis.connect();
const app = TestApp.create(db, redis);

let ram: Auth;
let sita: Auth;
let relationshipId: number;
let applicationId: number;

const upload = (auth: Auth, documentCode: string, data: Buffer = PDF, name = 'citizenship.pdf') =>
  request(app)
    .post(`/applications/${applicationId}/documents`)
    .set(auth)
    .field('documentCode', documentCode)
    .attach('file', data, name);
const submit = (auth: Auth, version: number) =>
  request(app).post(`/applications/${applicationId}/submit`).set(auth).send({ version });

beforeAll(async () => {
  await DivisionsSeed.run(db);
  await ServiceTypesSeed.run(db);
  const types = await db.select().from(serviceTypes);
  relationshipId =
    types.find((t) => t.localLevelCode === KATHMANDU && t.code === 'relationship')?.id ?? 0;
});
beforeEach(async () => {
  await redis.flushdb();
  await TestDb.reset(db);
  ram = (await TestApp.login(db, redis, { phone: '9841000001', name: 'Ram Thapa' })).auth;
  sita = (await TestApp.login(db, redis, { phone: '9841000002', name: 'Sita Rai' })).auth;
  const res = await request(app)
    .post('/applications')
    .set(ram)
    .send({
      serviceTypeId: relationshipId,
      localLevelCode: KATHMANDU,
      wardNo: 5,
      tole: 'Baneshwor',
      formData: { relativeName: 'Hari Bahadur Thapa', relation: 'Father' },
    });
  applicationId = res.body.application.id;
});
afterAll(async () => {
  await pool.end();
  redis.disconnect();
});

describe('POST /applications/:id/documents', () => {
  it('stores a PDF with its size and SHA-256', async () => {
    const res = await upload(ram, 'citizenship');
    expect(res.status).toBe(201);
    expect(res.body.document).toMatchObject({
      documentCode: 'citizenship',
      originalName: 'citizenship.pdf',
      mime: 'application/pdf',
      sizeBytes: PDF.length,
      sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('judges the file by its bytes, not its name', async () => {
    const res = await upload(ram, 'citizenship', Buffer.from('MZ fake executable'), 'scan.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Only PDF, JPEG or PNG files are accepted');
  });

  it('rejects files over 5 MB with 413', async () => {
    const big = Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]);
    expect((await upload(ram, 'citizenship', big)).status).toBe(413);
  });

  it('rejects a document the service type does not ask for', async () => {
    const res = await upload(ram, 'passport');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('This service does not ask for passport');
  });

  it('replaces the previous file for the same document', async () => {
    await upload(ram, 'citizenship');
    const second = Buffer.from('%PDF-1.4\nsecond version\n%%EOF\n');
    await upload(ram, 'citizenship', second);
    const res = await request(app).get(`/applications/${applicationId}/documents`).set(ram);
    expect(res.body.documents).toHaveLength(1);
    expect(res.body.documents[0].sizeBytes).toBe(second.length);
  });

  it('does not let another citizen upload to it', async () => {
    expect((await upload(sita, 'citizenship')).status).toBe(404);
  });
});

describe('GET /applications/:id/documents/:documentId/file', () => {
  it('returns the exact bytes to the owner only', async () => {
    const { id } = (await upload(ram, 'citizenship')).body.document;
    const url = `/applications/${applicationId}/documents/${id}/file`;
    const res = await request(app).get(url).set(ram).buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-disposition']).toContain('citizenship.pdf');
    expect(Buffer.from(res.body).equals(PDF)).toBe(true);
    expect((await request(app).get(url).set(sita)).status).toBe(404);
  });
});

describe('POST /applications/:id/submit', () => {
  const uploadAll = async () => {
    await upload(ram, 'citizenship');
    await upload(ram, 'relative_citizenship');
  };

  it('lists the missing documents', async () => {
    await upload(ram, 'citizenship');
    const res = await submit(ram, 1);
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual({ missingDocuments: ['relative_citizenship'] });
  });

  it('requires every required form field', async () => {
    await db.execute(
      sql`UPDATE applications SET form_data = '{"relativeName":"Hari"}' WHERE id = ${applicationId}`,
    );
    await uploadAll();
    const res = await submit(ram, 1);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Fill in every required field');
    expect(res.body.error.details[0].path).toEqual(['relation']);
  });

  it('requires the citizen to have set their name', async () => {
    await db.execute(sql`UPDATE users SET name = NULL WHERE phone = '9841000001'`);
    await uploadAll();
    const res = await submit(ram, 1);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Set your full name before submitting');
  });

  it('submits, records history, and locks further edits', async () => {
    await uploadAll();
    const res = await submit(ram, 1);
    expect(res.status).toBe(200);
    expect(res.body.application).toMatchObject({
      status: 'submitted',
      version: 2,
      submittedAt: expect.any(String),
    });

    const history = await request(app).get(`/applications/${applicationId}/history`).set(ram);
    expect(history.body.history.map((h: { toStatus: string }) => h.toStatus)).toEqual([
      'draft',
      'submitted',
    ]);
    expect(history.body.history[1].fromStatus).toBe('draft');

    const edit = await request(app)
      .patch(`/applications/${applicationId}`)
      .set(ram)
      .send({ version: 2, tole: 'Koteshwor' });
    expect(edit.status).toBe(409);
    expect((await upload(ram, 'citizenship')).status).toBe(409);
  });

  it('lets exactly one of two simultaneous submits win', async () => {
    await uploadAll();
    const results = await Promise.all([submit(ram, 1), submit(ram, 1)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const history = await request(app).get(`/applications/${applicationId}/history`).set(ram);
    expect(history.body.history).toHaveLength(2);
  });
});
