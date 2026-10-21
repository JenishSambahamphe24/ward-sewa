import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { wards } from './divisions.ts';
import { serviceTypes } from './service-types.ts';
import { users } from './users.ts';

export const applicationStatus = pgEnum('application_status', [
  'draft',
  'submitted',
  'under_review',
  'needs_info',
  'approved',
  'rejected',
  'issued',
]);

export const applications = pgTable(
  'applications',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    trackingNo: text().notNull().unique('applications_tracking_no_unique'),
    citizenId: integer()
      .notNull()
      .references(() => users.id),
    // The ward office handling it, which is also the applicant's ward of residence.
    wardId: integer()
      .notNull()
      .references(() => wards.id),
    serviceTypeId: integer()
      .notNull()
      .references(() => serviceTypes.id),
    status: applicationStatus().notNull().default('draft'),
    tole: text().notNull(),
    houseNo: text(),
    formData: jsonb().$type<Record<string, string>>().notNull().default({}),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    submittedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    check('applications_version_positive', sql`${t.version} > 0`),
    index('applications_citizen_created_index').on(t.citizenId, t.createdAt.desc()),
    index('applications_ward_status_created_index').on(t.wardId, t.status, t.createdAt.desc()),
  ],
);
