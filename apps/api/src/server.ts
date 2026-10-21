import { Redis } from 'ioredis';
import { MongoClient } from 'mongodb';
import pg from 'pg';
import { pino } from 'pino';
import { createApp } from './app.ts';
import { createDb } from './db/client.ts';
import { EnvHelper } from './lib/env.helper.ts';
import { LogSmsGateway } from './lib/sms.ts';

const env = EnvHelper.load();
const logger = pino({ level: env.LOG_LEVEL });

const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });
const mongo = new MongoClient(env.MONGO_URL, { serverSelectionTimeoutMS: 2000 });
const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });

// Keep the process alive through a dependency outage; /health/ready reports it.
pool.on('error', (err) => logger.error({ err }, 'postgres pool error'));
redis.on('error', (err) => logger.warn({ err: err.message }, 'redis connection error'));

try {
  await mongo.connect();
} catch (err) {
  logger.warn({ err: (err as Error).message }, 'mongo unavailable at startup; will keep retrying');
}

const app = createApp({
  logger,
  db: createDb(pool),
  redis,
  sms: new LogSmsGateway(logger),
  authSecret: env.AUTH_SECRET,
  healthChecks: {
    postgres: () => pool.query('SELECT 1'),
    mongo: () => mongo.db().command({ ping: 1 }),
    redis: () => redis.ping(),
  },
});

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'api listening');
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'shutting down');
  const forceExit = setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await Promise.allSettled([pool.end(), mongo.close(), redis.quit()]);
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
