import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { applications } from './applications.ts';
import { wards } from './divisions.ts';
import { users } from './users.ts';

// What the letter says, frozen at issue time. Renames and profile edits must never change it.
export interface LetterSnapshot {
  applicant: { name: string };
  serviceType: { code: string; nameEn: string; nameNe: string };
  address: {
    province: string;
    district: string;
    localLevel: string;
    localLevelCode: string;
    wardNo: number;
    tole: string;
    houseNo: string | null;
  };
  formData: Record<string, string>;
  // Labels frozen with the values; letters issued before 22 Oct lack this and print raw keys.
  fields?: { key: string; labelNe: string; labelEn: string; value: string }[];
}

// A counter row, not a SEQUENCE: sequences skip numbers when a transaction rolls back, and a
// letter register must be gap-free. The row lock also serialises issuing within a ward.
export const letterCounters = pgTable(
  'letter_counters',
  {
    wardId: integer()
      .notNull()
      .references(() => wards.id),
    fiscalYear: text().notNull(),
    lastNo: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.wardId, t.fiscalYear] })],
);

export const issuedLetters = pgTable(
  'issued_letters',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    applicationId: integer()
      .notNull()
      .unique('issued_letters_application_id_unique')
      .references(() => applications.id),
    wardId: integer()
      .notNull()
      .references(() => wards.id),
    fiscalYear: text().notNull(),
    serialNo: integer().notNull(),
    letterNo: text().notNull(),
    issuedDateBs: text().notNull(),
    verificationCode: text().notNull().unique('issued_letters_verification_code_unique'),
    snapshot: jsonb().$type<LetterSnapshot>().notNull(),
    issuedBy: integer()
      .notNull()
      .references(() => users.id),
    issuedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    pdfStorageKey: text(),
  },
  (t) => [
    unique('issued_letters_ward_fiscal_year_serial_unique').on(t.wardId, t.fiscalYear, t.serialNo),
    check('issued_letters_serial_positive', sql`${t.serialNo} > 0`),
    check('issued_letters_fiscal_year_format', sql`${t.fiscalYear} ~ '^[0-9]{4}/[0-9]{2}$'`),
  ],
);
