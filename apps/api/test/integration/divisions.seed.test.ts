import { and, count, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { districts, localLevels, provinces, wards } from '../../src/db/schema/index.ts';
import { DivisionsSeed } from '../../src/db/seeds/divisions.seed.ts';
import { TestDb } from './support/test-db.ts';

const { pool, db } = TestDb.connect();
const total = async (
  table: typeof provinces | typeof districts | typeof localLevels | typeof wards,
) => (await db.select({ n: count() }).from(table))[0]?.n;

beforeAll(() => DivisionsSeed.run(db));
afterAll(() => pool.end());

describe('DivisionsSeed', () => {
  it('loads every province, district, local level and ward', async () => {
    expect(await total(provinces)).toBe(7);
    expect(await total(districts)).toBe(77);
    expect(await total(localLevels)).toBe(753);
    expect(await total(wards)).toBe(6743);
  });

  it('gives Kathmandu Metropolitan City wards 1 to 32', async () => {
    const rows = await db
      .select({ wardNo: wards.wardNo })
      .from(wards)
      .where(eq(wards.localLevelCode, 'NP0327101'))
      .orderBy(wards.wardNo);
    expect(rows.map((r) => r.wardNo)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  });

  it('is idempotent and keeps existing ward ids stable', async () => {
    const [before] = await db
      .select({ id: wards.id })
      .from(wards)
      .where(and(eq(wards.localLevelCode, 'NP0327101'), eq(wards.wardNo, 5)));
    await DivisionsSeed.run(db);
    const [after] = await db
      .select({ id: wards.id })
      .from(wards)
      .where(and(eq(wards.localLevelCode, 'NP0327101'), eq(wards.wardNo, 5)));
    expect(await total(wards)).toBe(6743);
    expect(after?.id).toBe(before?.id);
  });

  it('restores an official name that was changed by hand', async () => {
    await db.update(localLevels).set({ name: 'KTM' }).where(eq(localLevels.code, 'NP0327101'));
    await DivisionsSeed.run(db);
    const [row] = await db
      .select({ name: localLevels.name })
      .from(localLevels)
      .where(eq(localLevels.code, 'NP0327101'));
    expect(row?.name).toBe('Kathmandu');
  });
});

describe('division constraints', () => {
  it('rejects a duplicate ward', async () => {
    await expect(
      db.insert(wards).values({ localLevelCode: 'NP0327101', wardNo: 1 }),
    ).rejects.toMatchObject({ cause: { code: '23505' } });
  });

  it('rejects a ward of a local level that does not exist', async () => {
    await expect(
      db.insert(wards).values({ localLevelCode: 'NP9999999', wardNo: 1 }),
    ).rejects.toMatchObject({ cause: { code: '23503' } });
  });

  it('rejects ward number 0 and malformed codes', async () => {
    await expect(
      db.insert(wards).values({ localLevelCode: 'NP0327101', wardNo: 0 }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });
    await expect(
      db.execute(sql`insert into provinces (code, name) values ('Bagmati', 'Bagmati')`),
    ).rejects.toMatchObject({ cause: { code: '23514' } });
  });
});
