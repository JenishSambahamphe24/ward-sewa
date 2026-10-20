import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import * as schema from './schema/index.ts';

export type Db = NodePgDatabase<typeof schema>;

export function createDb(pool: pg.Pool): Db {
  return drizzle(pool, { schema, casing: 'snake_case' });
}
