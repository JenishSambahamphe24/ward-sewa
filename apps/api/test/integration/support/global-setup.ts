import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { MIGRATIONS_FOLDER } from '../../../src/db/migrate.ts';
import { TestDb } from './test-db.ts';

// Recreates the test database on every run so tests never depend on leftover data.
export default async function setup(): Promise<void> {
  const adminUrl = new URL(TestDb.url);
  const name = adminUrl.pathname.slice(1);
  if (!/^[a-z_]+_test$/.test(name)) throw new Error(`Refusing to recreate "${name}"`);
  adminUrl.pathname = '/postgres';

  const admin = new pg.Client({ connectionString: adminUrl.href });
  await admin.connect().catch((err: Error) => {
    throw new Error(
      `Cannot reach PostgreSQL at ${adminUrl.host}. Start it: docker compose up -d --wait postgres`,
      { cause: err },
    );
  });
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();

  const { pool, db } = TestDb.connect();
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  await pool.end();
}
