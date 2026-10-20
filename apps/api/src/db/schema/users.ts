import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { localLevels, wards } from './divisions.ts';

export const userRole = pgEnum('user_role', [
  'citizen',
  'ward_secretary',
  'ward_chair',
  'municipality_admin',
]);

export const users = pgTable(
  'users',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    phone: text().notNull().unique(),
    name: text(),
    role: userRole().notNull().default('citizen'),
    wardId: integer().references(() => wards.id),
    localLevelCode: text().references(() => localLevels.code),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check('users_phone_format', sql`${t.phone} ~ '^9[678][0-9]{8}$'`),
    // Each role carries exactly the scope it acts within.
    check(
      'users_role_scope',
      sql`(${t.role} = 'citizen' AND ${t.wardId} IS NULL AND ${t.localLevelCode} IS NULL)
        OR (${t.role} IN ('ward_secretary', 'ward_chair') AND ${t.wardId} IS NOT NULL AND ${t.localLevelCode} IS NULL)
        OR (${t.role} = 'municipality_admin' AND ${t.localLevelCode} IS NOT NULL AND ${t.wardId} IS NULL)`,
    ),
    uniqueIndex('users_one_active_chair_per_ward')
      .on(t.wardId)
      .where(sql`${t.role} = 'ward_chair' AND ${t.isActive}`),
    index().on(t.wardId),
  ],
);
