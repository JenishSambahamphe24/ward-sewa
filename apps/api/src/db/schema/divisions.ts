import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  unique,
} from 'drizzle-orm/pg-core';

export const localLevelType = pgEnum('local_level_type', [
  'metropolitan',
  'sub_metropolitan',
  'municipality',
  'rural_municipality',
]);

export const provinces = pgTable(
  'provinces',
  {
    code: text().primaryKey(),
    name: text().notNull(),
  },
  (t) => [check('provinces_code_format', sql`${t.code} ~ '^NP[0-9]{2}$'`)],
);

export const districts = pgTable(
  'districts',
  {
    code: text().primaryKey(),
    name: text().notNull(),
    provinceCode: text()
      .notNull()
      .references(() => provinces.code),
  },
  (t) => [
    check('districts_code_format', sql`${t.code} ~ '^NP[0-9]{4}$'`),
    index().on(t.provinceCode),
  ],
);

export const localLevels = pgTable(
  'local_levels',
  {
    code: text().primaryKey(),
    name: text().notNull(),
    type: localLevelType().notNull(),
    districtCode: text()
      .notNull()
      .references(() => districts.code),
    wardCount: smallint().notNull(),
  },
  (t) => [
    check('local_levels_code_format', sql`${t.code} ~ '^NP[0-9]{7}$'`),
    check('local_levels_ward_count_positive', sql`${t.wardCount} > 0`),
    index().on(t.districtCode),
  ],
);

// Each row is also the ward office that staff belong to and applications are addressed to.
export const wards = pgTable(
  'wards',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    localLevelCode: text()
      .notNull()
      .references(() => localLevels.code),
    wardNo: smallint().notNull(),
  },
  (t) => [
    unique('wards_local_level_code_ward_no_unique').on(t.localLevelCode, t.wardNo),
    check('wards_ward_no_positive', sql`${t.wardNo} > 0`),
  ],
);
