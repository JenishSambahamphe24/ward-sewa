import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { applications } from './applications.ts';
import { users } from './users.ts';

export const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const documents = pgTable(
  'documents',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    applicationId: integer()
      .notNull()
      .references(() => applications.id),
    documentCode: text().notNull(),
    storageKey: text().notNull().unique('documents_storage_key_unique'),
    originalName: text().notNull(),
    mime: text().notNull(),
    sizeBytes: integer().notNull(),
    sha256: text().notNull(),
    uploadedBy: integer()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('documents_application_id_document_code_unique').on(t.applicationId, t.documentCode),
    check(
      'documents_mime_allowed',
      sql`${t.mime} IN ('application/pdf', 'image/jpeg', 'image/png')`,
    ),
    check(
      'documents_size_range',
      sql`${t.sizeBytes} > 0 AND ${t.sizeBytes} <= ${sql.raw(String(MAX_DOCUMENT_BYTES))}`,
    ),
    check('documents_sha256_format', sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
  ],
);
