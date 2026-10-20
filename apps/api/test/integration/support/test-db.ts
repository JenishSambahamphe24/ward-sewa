import pg from 'pg';
import { createDb } from '../../../src/db/client.ts';
import type { Db } from '../../../src/db/client.ts';

export class TestDb {
  static readonly url =
    process.env.TEST_DATABASE_URL ??
    'postgres://ward_sewa:ward_sewa_dev@localhost:5432/ward_sewa_test';

  static connect(): { pool: pg.Pool; db: Db } {
    const pool = new pg.Pool({ connectionString: TestDb.url, max: 4 });
    return { pool, db: createDb(pool) };
  }
}
