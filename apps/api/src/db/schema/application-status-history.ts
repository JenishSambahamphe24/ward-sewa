import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { applicationStatus, applications } from './applications.ts';
import { users } from './users.ts';

export const applicationStatusHistory = pgTable(
  'application_status_history',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    applicationId: integer()
      .notNull()
      .references(() => applications.id),
    fromStatus: applicationStatus(),
    toStatus: applicationStatus().notNull(),
    actorId: integer()
      .notNull()
      .references(() => users.id),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('application_status_history_application_index').on(t.applicationId, t.createdAt)],
);
