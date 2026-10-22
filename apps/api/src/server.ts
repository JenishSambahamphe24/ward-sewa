import { Redis } from 'ioredis';
import { MongoClient } from 'mongodb';
import pg from 'pg';
import { pino } from 'pino';
import { createApp } from './app.ts';
import { createDb } from './db/client.ts';
import { EnvHelper } from './lib/env.helper.ts';
import { LocalFileStorage } from './lib/file-storage.ts';
import { LogSmsGateway } from './lib/sms.ts';
import { AuditStore } from './modules/audit/audit.store.ts';
import {
  NotificationLogStore,
  RecordingSmsGateway,
} from './modules/audit/notification-log.store.ts';
import { BullLetterPdfQueue } from './modules/letters/letter-pdf.queue.ts';

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

const notificationLogs = new NotificationLogStore(mongo.db());
await Promise.all([
  new AuditStore(mongo.db()).ensureIndexes(),
  notificationLogs.ensureIndexes(),
]).catch((err: Error) =>
  logger.warn({ err: err.message }, 'could not ensure mongo indexes; will retry next start'),
);
const letterPdfQueue = new BullLetterPdfQueue(redis);

const app = createApp({
  logger,
  db: createDb(pool),
  redis,
  mongo: mongo.db(),
  sms: new RecordingSmsGateway(new LogSmsGateway(logger), notificationLogs, logger),
  storage: new LocalFileStorage(env.UPLOAD_DIR),
  letterPdfQueue,
  authSecret: env.AUTH_SECRET,
  trustProxy: env.TRUST_PROXY,
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
    await Promise.allSettled([letterPdfQueue.close(), pool.end(), mongo.close()]);
    await redis.quit();
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
