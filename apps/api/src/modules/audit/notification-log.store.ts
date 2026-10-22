import type { Collection, Db as MongoDb } from 'mongodb';
import type { Logger } from 'pino';
import type { SmsGateway } from '../../lib/sms.ts';

export const NOTIFICATION_LOG_TTL_SECONDS = 90 * 24 * 60 * 60;

interface NotificationLog {
  channel: 'sms';
  to: string;
  purpose: string;
  status: 'sent' | 'failed';
  error?: string;
  at: Date;
}

export class NotificationLogStore {
  readonly #logs: Collection<NotificationLog>;

  constructor(mongo: MongoDb) {
    this.#logs = mongo.collection<NotificationLog>('notification_logs');
  }

  // MongoDB deletes each log about 90 days after `at` (a background job runs every ~60 s).
  async ensureIndexes(): Promise<void> {
    await this.#logs.createIndexes([
      {
        key: { at: 1 },
        name: 'expire_after_90_days',
        expireAfterSeconds: NOTIFICATION_LOG_TTL_SECONDS,
      },
      { key: { to: 1, at: -1 }, name: 'by_recipient' },
    ]);
  }

  async record(log: NotificationLog): Promise<void> {
    await this.#logs.insertOne(log);
  }
}

// Wraps a gateway so every attempt is logged. Logging is best effort: a MongoDB outage must
// never stop a citizen's OTP from being sent.
export class RecordingSmsGateway implements SmsGateway {
  readonly #inner: SmsGateway;
  readonly #logs: NotificationLogStore;
  readonly #logger: Logger;

  constructor(inner: SmsGateway, logs: NotificationLogStore, logger: Logger) {
    this.#inner = inner;
    this.#logs = logs;
    this.#logger = logger;
  }

  async send(phone: string, message: string, purpose: string): Promise<void> {
    const base = {
      channel: 'sms' as const,
      to: `******${phone.slice(-4)}`,
      purpose,
      at: new Date(),
    };
    try {
      await this.#inner.send(phone, message, purpose);
      await this.#record({ ...base, status: 'sent' });
    } catch (err) {
      await this.#record({ ...base, status: 'failed', error: (err as Error).message });
      throw err;
    }
  }

  async #record(log: NotificationLog): Promise<void> {
    await this.#logs.record(log).catch((err: Error) => {
      this.#logger.warn({ err: err.message }, 'could not write notification log');
    });
  }
}
