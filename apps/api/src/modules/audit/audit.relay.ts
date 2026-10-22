import { asc, inArray } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { auditOutbox } from '../../db/schema/index.ts';
import type { AuditStore } from './audit.store.ts';

// Moves committed events from the PostgreSQL outbox to MongoDB. If MongoDB fails, the
// transaction rolls back and the rows stay for the next attempt; SKIP LOCKED lets several
// workers share the outbox without taking the same rows.
export class AuditRelay {
  readonly #db: Db;
  readonly #store: AuditStore;

  constructor(db: Db, store: AuditStore) {
    this.#db = db;
    this.#store = store;
  }

  relayBatch(limit = 100): Promise<number> {
    return this.#db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(auditOutbox)
        .orderBy(asc(auditOutbox.id))
        .limit(limit)
        .for('update', { skipLocked: true });
      if (rows.length === 0) return 0;

      await this.#store.insertMany(
        rows.map(({ id, event }) => ({ ...event, _id: id, at: new Date(event.at) })),
      );
      await tx.delete(auditOutbox).where(
        inArray(
          auditOutbox.id,
          rows.map((row) => row.id),
        ),
      );
      return rows.length;
    });
  }
}
