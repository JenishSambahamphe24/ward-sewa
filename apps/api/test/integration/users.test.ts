import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { users, wards } from '../../src/db/schema/index.ts';
import { DivisionsSeed } from '../../src/db/seeds/divisions.seed.ts';
import { UsersRepository } from '../../src/modules/users/users.repository.ts';
import { UsersService } from '../../src/modules/users/users.service.ts';
import { TestDb } from './support/test-db.ts';

const KATHMANDU = 'NP0327101';
const { pool, db } = TestDb.connect();
const service = new UsersService(new UsersRepository(db));
let ward5: number;

beforeAll(async () => {
  await DivisionsSeed.run(db);
  const [row] = await db
    .select({ id: wards.id })
    .from(wards)
    .where(and(eq(wards.localLevelCode, KATHMANDU), eq(wards.wardNo, 5)));
  ward5 = row?.id ?? 0;
});
beforeEach(() => db.delete(users));
afterAll(() => pool.end());

describe('UsersService.createMunicipalityAdmin', () => {
  it('creates an admin scoped to the municipality', async () => {
    const admin = await service.createMunicipalityAdmin({
      phone: '9841000001',
      localLevelCode: KATHMANDU,
      name: 'Sita Sharma',
    });
    expect(admin).toMatchObject({
      role: 'municipality_admin',
      localLevelCode: KATHMANDU,
      wardId: null,
      isActive: true,
    });
  });

  it('refuses a phone number that is already registered', async () => {
    await db.insert(users).values({ phone: '9841000001' });
    await expect(
      service.createMunicipalityAdmin({
        phone: '9841000001',
        localLevelCode: KATHMANDU,
        name: 'X',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
  });

  it('refuses an unknown local level', async () => {
    await expect(
      service.createMunicipalityAdmin({
        phone: '9841000001',
        localLevelCode: 'NP0327199',
        name: 'X',
      }),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('refuses a malformed phone number', async () => {
    await expect(
      service.createMunicipalityAdmin({ phone: '12345', localLevelCode: KATHMANDU, name: 'X' }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe('users table constraints', () => {
  const violation = (code: string) => ({ cause: { code } });

  it('requires each role to carry exactly its own scope', async () => {
    const bad = [
      { phone: '9841000001', role: 'citizen' as const, wardId: ward5 },
      { phone: '9841000002', role: 'ward_secretary' as const },
      { phone: '9841000003', role: 'ward_chair' as const, localLevelCode: KATHMANDU },
      { phone: '9841000004', role: 'municipality_admin' as const, wardId: ward5 },
    ];
    for (const values of bad) {
      await expect(db.insert(users).values(values)).rejects.toMatchObject(violation('23514'));
    }
  });

  it('rejects phone numbers that are not Nepali mobiles', async () => {
    await expect(db.insert(users).values({ phone: '0141234567' })).rejects.toMatchObject(
      violation('23514'),
    );
  });

  it('allows only one active chair per ward', async () => {
    await db.insert(users).values({ phone: '9841000001', role: 'ward_chair', wardId: ward5 });
    await expect(
      db.insert(users).values({ phone: '9841000002', role: 'ward_chair', wardId: ward5 }),
    ).rejects.toMatchObject(violation('23505'));
  });

  it('allows a new chair once the previous one is deactivated', async () => {
    await db
      .insert(users)
      .values({ phone: '9841000001', role: 'ward_chair', wardId: ward5, isActive: false });
    await expect(
      db.insert(users).values({ phone: '9841000002', role: 'ward_chair', wardId: ward5 }),
    ).resolves.toBeDefined();
  });

  it('allows several secretaries in one ward', async () => {
    await db.insert(users).values([
      { phone: '9841000001', role: 'ward_secretary', wardId: ward5 },
      { phone: '9841000002', role: 'ward_secretary', wardId: ward5 },
    ]);
    expect(await db.select().from(users).where(eq(users.wardId, ward5))).toHaveLength(2);
  });
});
