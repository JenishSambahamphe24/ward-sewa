import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Redis } from 'ioredis';
import { pino } from 'pino';
import { createApp } from '../../../src/app.ts';
import { DEFAULT_RATE_LIMITS } from '../../../src/middleware/rate-limit.ts';
import type { RateLimits } from '../../../src/middleware/rate-limit.ts';
import type { AppDeps } from '../../../src/app.ts';
import type { Db } from '../../../src/db/client.ts';
import { users } from '../../../src/db/schema/index.ts';
import { LocalFileStorage } from '../../../src/lib/file-storage.ts';
import { SessionStore } from '../../../src/modules/auth/session.store.ts';
import { TestMongo } from './test-mongo.ts';

// Ordinary tests must never trip a limit; rate-limit.test.ts sets its own small ones.
const UNLIMITED = Object.fromEntries(
  Object.entries(DEFAULT_RATE_LIMITS).map(([name, rule]) => [name, { ...rule, limit: 1_000_000 }]),
) as unknown as RateLimits;

export class TestApp {
  static create(db: Db, redis: Redis, overrides: Partial<AppDeps> = {}) {
    return createApp({
      logger: pino({ level: 'silent' }),
      db,
      redis,
      mongo: TestMongo.db(),
      sms: { send: () => Promise.resolve() },
      storage: new LocalFileStorage(mkdtempSync(join(tmpdir(), 'ward-sewa-uploads-'))),
      letterPdfQueue: { enqueue: () => Promise.resolve() },
      authSecret: 'test-secret-test-secret-test-secret',
      healthChecks: {},
      rateLimits: UNLIMITED,
      ...overrides,
    });
  }

  // Skips the OTP flow: inserts the user and opens a session for them.
  static async login(db: Db, redis: Redis, values: typeof users.$inferInsert) {
    const [user] = await db.insert(users).values(values).returning();
    if (!user) throw new Error('user insert returned no row');
    const token = await new SessionStore(redis).create(user.id);
    return { user, auth: { Authorization: `Bearer ${token}` } };
  }
}
