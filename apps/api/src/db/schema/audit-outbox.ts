import { bigint, jsonb, pgTable, timestamp } from 'drizzle-orm/pg-core';

export type AuditEventType =
  | 'application.created'
  | 'application.submitted'
  | 'application.under_review'
  | 'application.needs_info'
  | 'application.rejected'
  | 'application.approved'
  | 'application.issued'
  | 'letter.issued'
  | 'staff.assigned'
  | 'staff.updated';

export interface AuditEvent {
  type: AuditEventType;
  actor: { userId: number; role: string };
  target: { applicationId?: number; letterId?: number; userId?: number };
  changes?: Record<string, { from: unknown; to: unknown }>;
  note?: string;
  at: string;
}

// Written in the same transaction as the change it describes; the worker relays rows to the
// MongoDB audit log and deletes them. An event exists if and only if its change committed.
export const auditOutbox = pgTable('audit_outbox', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  event: jsonb().$type<AuditEvent>().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
