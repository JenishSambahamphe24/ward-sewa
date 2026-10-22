import { MongoBulkWriteError } from 'mongodb';
import type { Collection, Db as MongoDb } from 'mongodb';
import type { AuditEvent } from '../../db/schema/index.ts';

// The outbox row id becomes _id, so relaying the same event twice can't create a duplicate.
export interface StoredAuditEvent extends Omit<AuditEvent, 'at'> {
  _id: number;
  at: Date;
}

const DUPLICATE_KEY = 11000;

export class AuditStore {
  readonly #events: Collection<StoredAuditEvent>;

  constructor(mongo: MongoDb) {
    this.#events = mongo.collection<StoredAuditEvent>('audit_events');
  }

  async ensureIndexes(): Promise<void> {
    await this.#events.createIndexes([
      { key: { 'target.applicationId': 1, at: 1 }, name: 'by_application' },
      { key: { 'target.userId': 1, at: 1 }, name: 'by_target_user' },
      { key: { 'actor.userId': 1, at: -1 }, name: 'by_actor' },
    ]);
  }

  async insertMany(events: StoredAuditEvent[]): Promise<void> {
    try {
      await this.#events.insertMany(events, { ordered: false, writeConcern: { w: 'majority' } });
    } catch (err) {
      const onlyDuplicates =
        err instanceof MongoBulkWriteError &&
        err.writeErrors instanceof Array &&
        err.writeErrors.every((e) => e.code === DUPLICATE_KEY);
      if (!onlyDuplicates) throw err;
    }
  }

  forApplication(applicationId: number): Promise<StoredAuditEvent[]> {
    return this.#events
      .find({ 'target.applicationId': applicationId })
      .sort({ at: 1, _id: 1 })
      .toArray();
  }
}
