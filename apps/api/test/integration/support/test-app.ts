import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Redis } from 'ioredis';
import { pino } from 'pino';
import { createApp } from '../../../src/app.ts';
import type { AppDeps } from '../../../src/app.ts';
import type { Db } from '../../../src/db/client.ts';
import { users } from '../../../src/db/schema/index.ts';
import { LocalFileStorage } from '../../../src/lib/file-storage.ts';
import { SessionStore } from '../../../src/modules/auth/session.store.ts';

export class TestApp {
  static create(db: Db, redis: Redis, overrides: Partial<AppDeps> = {}) {
    return createApp({
      logger: pino({ level: 'silent' }),
      db,
      redis,
      sms: { send: () => Promise.resolve() },
      storage: new LocalFileStorage(mkdtempSync(join(tmpdir(), 'ward-sewa-uploads-'))),
      letterPdfQueue: { enqueue: () => Promise.resolve() },
      authSecret: 'test-secret-test-secret-test-secret',
      healthChecks: {},
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
