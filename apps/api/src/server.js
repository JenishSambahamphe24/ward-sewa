import { MongoClient } from 'mongodb';
import pg from 'pg';
import { Redis } from 'ioredis';
import pino from 'pino';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const logger = pino({ level: config.LOG_LEVEL });

const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10 });
const mongo = new MongoClient(config.MONGO_URL, { serverSelectionTimeoutMS: 2000 });
const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 1 });

// Keep the process alive through a dependency outage; /health/ready reports it.
pool.on('error', (err) => logger.error({ err }, 'postgres pool error'));
redis.on('error', (err) => logger.warn({ err: err.message }, 'redis connection error'));

try {
  await mongo.connect();
} catch (err) {
  logger.warn({ err: err.message }, 'mongo unavailable at startup; will keep retrying');
}

const app = createApp({
  logger,
  healthChecks: {
    postgres: () => pool.query('SELECT 1'),
    mongo: () => mongo.db().command({ ping: 1 }),
    redis: () => redis.ping(),
  },
});

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'api listening');
});

// Stop taking new requests, let in-flight ones finish, then close connections.
async function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  const forceExit = setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await Promise.allSettled([pool.end(), mongo.close(), redis.quit()]);
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
