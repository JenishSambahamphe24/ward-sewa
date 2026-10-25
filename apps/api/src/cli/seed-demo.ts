// Demo accounts for local development and the README walkthrough. Never run in production.
// Usage: pnpm --filter @ward-sewa/api seed:demo

import pg from 'pg';
import { pino } from 'pino';
import { createDb } from '../db/client.ts';
import { users } from '../db/schema/users.ts';
import { EnvHelper } from '../lib/env.helper.ts';
import { WardsRepository } from '../modules/divisions/wards.repository.ts';

type DemoUser =
  | { phone: string; name: string; role: 'citizen' }
  | { phone: string; name: string; role: 'municipality_admin'; localLevelCode: string }
  | {
      phone: string;
      name: string;
      role: 'ward_secretary' | 'ward_chair';
      localLevelCode: string;
      wardNo: number;
    };

const KATHMANDU = 'NP0327101';
const LALITPUR = 'NP0325101';

const DEMO_USERS: DemoUser[] = [
  {
    phone: '9841000001',
    name: 'Demo Admin',
    role: 'municipality_admin',
    localLevelCode: KATHMANDU,
  },
  {
    phone: '9841000002',
    name: 'Lalitpur Admin',
    role: 'municipality_admin',
    localLevelCode: LALITPUR,
  },
  {
    phone: '9851000005',
    name: 'Gita Shrestha',
    role: 'ward_secretary',
    localLevelCode: KATHMANDU,
    wardNo: 5,
  },
  {
    phone: '9851000006',
    name: 'Bishnu Karki',
    role: 'ward_chair',
    localLevelCode: KATHMANDU,
    wardNo: 5,
  },
  { phone: '9801112233', name: 'Ram Bahadur Thapa', role: 'citizen' },
  { phone: '9800000001', name: 'Sita Kumari Rai', role: 'citizen' },
];

const logger = pino();
if (process.env.NODE_ENV === 'production') {
  logger.error('seed:demo refuses to run in production');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: EnvHelper.loadDatabase().DATABASE_URL, max: 1 });
const db = createDb(pool);
const wards = new WardsRepository(db);

try {
  for (const user of DEMO_USERS) {
    let scope: { wardId: number | null; localLevelCode: string | null } = {
      wardId: null,
      localLevelCode: null,
    };
    if (user.role === 'municipality_admin') scope.localLevelCode = user.localLevelCode;
    if (user.role === 'ward_secretary' || user.role === 'ward_chair') {
      const wardId = await wards.findId(user.localLevelCode, user.wardNo);
      if (wardId === null) throw new Error(`No ward ${user.wardNo} in ${user.localLevelCode}`);
      scope = { wardId, localLevelCode: null };
    }
    const values = { name: user.name, role: user.role, ...scope, isActive: true };
    await db
      .insert(users)
      .values({ phone: user.phone, ...values })
      .onConflictDoUpdate({ target: users.phone, set: values });
    logger.info({ phone: user.phone, role: user.role }, 'demo user ready');
  }
} finally {
  await pool.end();
}
