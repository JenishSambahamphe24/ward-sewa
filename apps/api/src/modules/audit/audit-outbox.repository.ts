import type { DbExecutor } from '../../db/client.ts';
import { auditOutbox } from '../../db/schema/index.ts';
import type { AuditEvent } from '../../db/schema/index.ts';

export type NewAuditEvent = Omit<AuditEvent, 'at'>;

export class AuditOutboxRepository {
  // Always called with the caller's transaction, so the event commits or rolls back with it.
  static async add(tx: DbExecutor, event: NewAuditEvent): Promise<void> {
    await tx.insert(auditOutbox).values({ event: { ...event, at: new Date().toISOString() } });
  }
}
