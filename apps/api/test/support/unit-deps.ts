import type { Redis } from 'ioredis';
import type { Db as MongoDb } from 'mongodb';
import { pino } from 'pino';
import type { AppDeps } from '../../src/app.ts';
import type { Db } from '../../src/db/client.ts';
import type { FileStorage } from '../../src/lib/file-storage.ts';

// Unit tests exercise routes that never touch the database or Redis.
export class UnitDeps {
  static create(overrides: Partial<AppDeps> = {}): AppDeps {
    return {
      logger: pino({ level: 'silent' }),
      db: {} as Db,
      redis: {} as Redis,
      mongo: { collection: () => ({}) } as unknown as MongoDb,
      sms: { send: () => Promise.resolve() },
      storage: {} as FileStorage,
      letterPdfQueue: { enqueue: () => Promise.resolve() },
      authSecret: 'x'.repeat(32),
      healthChecks: {},
      ...overrides,
    };
  }
}
