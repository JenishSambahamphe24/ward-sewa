import { and, count, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { auditOutbox, serviceTypes, wards } from '../../src/db/schema/index.ts';
import { DivisionsSeed } from '../../src/db/seeds/divisions.seed.ts';
import { ServiceTypesSeed } from '../../src/db/seeds/service-types.seed.ts';
import { AuditRelay } from '../../src/modules/audit/audit.relay.ts';
import { AuditStore } from '../../src/modules/audit/audit.store.ts';
import {
  NOTIFICATION_LOG_TTL_SECONDS,
  NotificationLogStore,
  RecordingSmsGateway,
} from '../../src/modules/audit/notification-log.store.ts';
import { pino } from 'pino';
import { TestApp } from './support/test-app.ts';
import { TestDb } from './support/test-db.ts';
import { TestMongo } from './support/test-mongo.ts';
import { TestRedis } from './support/test-redis.ts';

type Auth = Record<string, string>;
const KATHMANDU = 'NP0327101';
const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');
const { pool, db } = TestDb.connect();
const redis = TestRedis.connect();
const app = TestApp.create(db, redis);
const store = new AuditStore(TestMongo.db());
const relay = new AuditRelay(db, store);

let unmarriedId: number;
let wardIds: Record<number, number>;
let citizen: Auth;
let sita: Auth;
let secretary5: Auth;
let chair5: Auth;
let secretary7: Auth;
let admin: Auth;

const outboxCount = async () => (await db.select({ n: count() }).from(auditOutbox))[0]?.n;
const move = (auth: Auth, id: number, version: number, to: string, note?: string) =>
  request(app).post(`/staff/applications/${id}/transition`).set(auth).send({ to, version, note });

async function submitted(): Promise<number> {
  const { body } = await request(app)
    .post('/applications')
    .set(citizen)
    .send({ serviceTypeId: unmarriedId, localLevelCode: KATHMANDU, wardNo: 5, tole: 'Baneshwor' });
  const id = body.application.id;
  await request(app)
    .post(`/applications/${id}/documents`)
    .set(citizen)
    .field('documentCode', 'citizenship')
    .attach('file', PDF, 'citizenship.pdf');
  await request(app).post(`/applications/${id}/submit`).set(citizen).send({ version: 1 });
  return id;
}

beforeAll(async () => {
  await DivisionsSeed.run(db);
  await ServiceTypesSeed.run(db);
  const [type] = await db.select().from(serviceTypes).where(eq(serviceTypes.code, 'unmarried'));
  unmarriedId = type?.id ?? 0;
  const wardId = async (wardNo: number) =>
    (
      await db
        .select({ id: wards.id })
        .from(wards)
        .where(and(eq(wards.localLevelCode, KATHMANDU), eq(wards.wardNo, wardNo)))
    )[0]?.id ?? 0;
  wardIds = { 5: await wardId(5), 7: await wardId(7) };
});
beforeEach(async () => {
  await redis.flushdb();
  await TestDb.reset(db);
  await TestMongo.reset();
  await store.ensureIndexes();
  const login = async (values: Parameters<typeof TestApp.login>[2]) =>
    (await TestApp.login(db, redis, values)).auth;
  citizen = await login({ phone: '9841000001', name: 'Ram Thapa' });
  sita = await login({ phone: '9841000002', name: 'Sita Rai' });
  secretary5 = await login({ phone: '9841000005', role: 'ward_secretary', wardId: wardIds[5] });
  chair5 = await login({ phone: '9841000006', role: 'ward_chair', wardId: wardIds[5] });
  secretary7 = await login({ phone: '9841000007', role: 'ward_secretary', wardId: wardIds[7] });
  admin = await login({
    phone: '9841000009',
    role: 'municipality_admin',
    localLevelCode: KATHMANDU,
  });
});
afterAll(async () => {
  await TestMongo.close();
  await pool.end();
  redis.disconnect();
});

describe('audit trail', () => {
  it('records an approval, relays it to MongoDB and shows the timeline', async () => {
    const id = await submitted();
    await move(secretary5, id, 2, 'under_review');
    await move(chair5, id, 3, 'approved', 'Verified in person');

    expect(await outboxCount()).toBe(4);
    expect(await relay.relayBatch()).toBe(4);
    expect(await outboxCount()).toBe(0);

    const res = await request(app).get(`/applications/${id}/audit`).set(citizen);
    expect(res.status).toBe(200);
    expect(res.body.events.map((e: { type: string }) => e.type)).toEqual([
      'application.created',
      'application.submitted',
      'application.under_review',
      'application.approved',
    ]);
    expect(res.body.events[3]).toMatchObject({
      actor: { role: 'ward_chair' },
      target: { applicationId: id },
      changes: { status: { from: 'under_review', to: 'approved' } },
      note: 'Verified in person',
      at: expect.any(String),
    });
  });

  it('writes no event when the change itself fails', async () => {
    const id = await submitted();
    const before = await outboxCount();
    expect((await move(secretary5, id, 99, 'under_review')).status).toBe(409);
    expect(await outboxCount()).toBe(before);
  });

  it('keeps events in the outbox while MongoDB is failing', async () => {
    await submitted();
    const broken = new AuditRelay(db, {
      insertMany: () => Promise.reject(new Error('MongoDB unavailable')),
    } as unknown as AuditStore);
    await expect(broken.relayBatch()).rejects.toThrow('MongoDB unavailable');
    expect(await outboxCount()).toBe(2);
    expect(await relay.relayBatch()).toBe(2);
  });

  it('never duplicates an event, even if a relay is retried after a crash', async () => {
    const id = await submitted();
    const rows = await db.select().from(auditOutbox);
    await store.insertMany(
      rows.map(({ id: _id, event }) => ({ ...event, _id, at: new Date(event.at) })),
    );
    expect(await relay.relayBatch()).toBe(2);
    expect(await store.forApplication(id)).toHaveLength(2);
  });

  it('shows the timeline only to the applicant and their ward staff', async () => {
    const id = await submitted();
    await relay.relayBatch();
    const audit = (auth: Auth) => request(app).get(`/applications/${id}/audit`).set(auth);
    expect((await audit(secretary5)).status).toBe(200);
    expect((await audit(sita)).status).toBe(404);
    expect((await audit(secretary7)).status).toBe(404);
  });

  it('records staff changes and issued letters', async () => {
    await request(app)
      .post('/admin/staff')
      .set(admin)
      .send({ phone: '9841000010', name: 'Gita', role: 'ward_secretary', wardNo: 6 });
    const id = await submitted();
    await move(secretary5, id, 2, 'under_review');
    await move(chair5, id, 3, 'approved');
    await request(app).post(`/staff/applications/${id}/issue`).set(secretary5).send({ version: 4 });

    const types = (await db.select().from(auditOutbox)).map((row) => row.event.type);
    expect(types).toContain('staff.assigned');
    expect(types).toContain('application.issued');
    expect(types).toContain('letter.issued');
  });

  it('answers the timeline query from the index, not a collection scan', async () => {
    const id = await submitted();
    await relay.relayBatch();
    const plan = await TestMongo.db()
      .collection('audit_events')
      .find({ 'target.applicationId': id })
      .sort({ at: 1, _id: 1 })
      .explain('queryPlanner');
    expect(JSON.stringify(plan.queryPlanner.winningPlan)).toContain('by_application');
    expect(JSON.stringify(plan.queryPlanner.winningPlan)).not.toContain('COLLSCAN');
  });
});

describe('notification logs', () => {
  it('records each SMS with a masked number, and expires after 90 days', async () => {
    const logs = new NotificationLogStore(TestMongo.db());
    await logs.ensureIndexes();
    const sms = new RecordingSmsGateway(
      { send: () => Promise.resolve() },
      logs,
      pino({ level: 'silent' }),
    );
    await sms.send('9841234567', 'code 123456', 'otp');

    const [log] = await TestMongo.db().collection('notification_logs').find().toArray();
    expect(log).toMatchObject({ channel: 'sms', to: '******4567', purpose: 'otp', status: 'sent' });
    expect(JSON.stringify(log)).not.toContain('123456');

    const indexes = await TestMongo.db().collection('notification_logs').indexes();
    expect(indexes.find((i) => i.name === 'expire_after_90_days')?.expireAfterSeconds).toBe(
      NOTIFICATION_LOG_TTL_SECONDS,
    );
  });

  it('still sends the SMS when the log cannot be written', async () => {
    let sent = false;
    const sms = new RecordingSmsGateway(
      { send: async () => void (sent = true) },
      { record: () => Promise.reject(new Error('down')) } as unknown as NotificationLogStore,
      pino({ level: 'silent' }),
    );
    await sms.send('9841234567', 'hello', 'otp');
    expect(sent).toBe(true);
  });
});
