import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  unique,
} from 'drizzle-orm/pg-core';
import { localLevels } from './divisions.ts';

export interface RequiredDocument {
  code: string;
  nameEn: string;
  nameNe: string;
}

export interface FormField {
  key: string;
  labelEn: string;
  labelNe: string;
  type: 'text' | 'date_bs';
  required: boolean;
}

// Per municipality: fees and required documents differ between local levels.
export const serviceTypes = pgTable(
  'service_types',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    localLevelCode: text()
      .notNull()
      .references(() => localLevels.code),
    code: text().notNull(),
    nameEn: text().notNull(),
    nameNe: text().notNull(),
    fee: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    requiredDocuments: jsonb().$type<RequiredDocument[]>().notNull().default([]),
    formFields: jsonb().$type<FormField[]>().notNull().default([]),
    isActive: boolean().notNull().default(true),
  },
  (t) => [
    unique('service_types_local_level_code_code_unique').on(t.localLevelCode, t.code),
    check('service_types_fee_non_negative', sql`${t.fee} >= 0`),
  ],
);
