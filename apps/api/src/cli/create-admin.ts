// Bootstraps a municipality's first admin. Deliberately not exposed over HTTP.
// Usage: pnpm admin:create --phone 98XXXXXXXX --local-level NP0327101 --name "Full Name"

import { parseArgs } from 'node:util';
import pg from 'pg';
import { pino } from 'pino';
import { ZodError } from 'zod';
import { createDb } from '../db/client.ts';
import { AppError } from '../lib/app-error.ts';
import { EnvHelper } from '../lib/env.helper.ts';
import { UsersRepository } from '../modules/users/users.repository.ts';
import { UsersService } from '../modules/users/users.service.ts';

const logger = pino();
const { values } = parseArgs({
  options: {
    phone: { type: 'string' },
    'local-level': { type: 'string' },
    name: { type: 'string' },
  },
});

const pool = new pg.Pool({ connectionString: EnvHelper.loadDatabase().DATABASE_URL, max: 1 });
const service = new UsersService(new UsersRepository(createDb(pool)));

try {
  const admin = await service.createMunicipalityAdmin({
    phone: values.phone ?? '',
    localLevelCode: values['local-level'] ?? '',
    name: values.name ?? '',
  });
  logger.info(
    { userId: admin.id, localLevelCode: admin.localLevelCode },
    'municipality admin created',
  );
} catch (err) {
  if (err instanceof AppError) logger.error(err.message);
  else if (err instanceof ZodError) logger.error({ issues: err.issues }, 'invalid arguments');
  else throw err;
  process.exitCode = 1;
} finally {
  await pool.end();
}
