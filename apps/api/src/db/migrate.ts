import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { pino } from 'pino';
import { EnvHelper } from '../lib/env.helper.ts';
import { createDb } from './client.ts';
import { DivisionsSeed } from './seeds/divisions.seed.ts';
import { ServiceTypesSeed } from './seeds/service-types.seed.ts';

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('./migrations', import.meta.url));

if (import.meta.main) {
  const logger = pino();
  const pool = new pg.Pool({ connectionString: EnvHelper.loadDatabase().DATABASE_URL, max: 1 });
  const db = createDb(pool);
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    logger.info('migrations applied');
    if (process.argv.includes('--seed')) {
      await DivisionsSeed.run(db);
      await ServiceTypesSeed.run(db);
      logger.info('divisions and sample service types seeded');
    }
  } finally {
    await pool.end();
  }
}
