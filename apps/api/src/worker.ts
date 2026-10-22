import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { MongoClient } from 'mongodb';
import pg from 'pg';
import { pino } from 'pino';
import { createDb } from './db/client.ts';
import { EnvHelper } from './lib/env.helper.ts';
import { LocalFileStorage } from './lib/file-storage.ts';
import { ApplicationsRepository } from './modules/applications/applications.repository.ts';
import { AuditRelay } from './modules/audit/audit.relay.ts';
import { AuditStore } from './modules/audit/audit.store.ts';
import { LETTER_PDF_QUEUE, BullLetterPdfQueue } from './modules/letters/letter-pdf.queue.ts';
import type { LetterPdfJob } from './modules/letters/letter-pdf.queue.ts';
import { LetterPdfProcessor } from './modules/letters/letter-pdf.processor.ts';
import { LettersRepository } from './modules/letters/letters.repository.ts';

const env = EnvHelper.loadWorker();
const logger = pino({ level: env.LOG_LEVEL });
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 4 });
const db = createDb(pool);
const letters = new LettersRepository(db, new ApplicationsRepository(db));
const processor = new LetterPdfProcessor({
  letters,
  storage: new LocalFileStorage(env.UPLOAD_DIR),
  publicBaseUrl: env.PUBLIC_BASE_URL,
});

// Workers block on Redis, so BullMQ needs a connection that retries forever.
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const worker = new Worker<LetterPdfJob>(
  LETTER_PDF_QUEUE,
  async (job) => processor.process(job.data.letterId),
  { connection, concurrency: 2 },
);
worker.on('completed', (job, result) =>
  logger.info({ jobId: job.id, letterId: job.data.letterId, result }, 'letter pdf job done'),
);
worker.on('failed', (job, err) =>
  logger.error(
    { jobId: job?.id, attempts: job?.attemptsMade, err: err.message },
    'letter pdf job failed',
  ),
);

// Recovers letters whose job was never queued (e.g. Redis was down right after issuing).
const queue = new BullLetterPdfQueue(connection);
const missing = await letters.idsMissingPdf(500);
await Promise.all(missing.map((id) => queue.enqueue(id)));
logger.info({ requeued: missing.length }, 'letter pdf worker started');

// Audit relay: drains the PostgreSQL outbox into MongoDB, pausing a second whenever it's empty
// or MongoDB is unavailable (the rows wait safely in the outbox).
const mongo = new MongoClient(env.MONGO_URL, { serverSelectionTimeoutMS: 2000 });
const auditStore = new AuditStore(mongo.db());
await auditStore
  .ensureIndexes()
  .catch((err: Error) => logger.warn({ err: err.message }, 'mongo indexes not ensured'));
const relay = new AuditRelay(db, auditStore);
let running = true;
const relayLoop = (async () => {
  while (running) {
    const relayed = await relay.relayBatch().catch((err: Error) => {
      logger.warn({ err: err.message }, 'audit relay failed; will retry');
      return 0;
    });
    if (relayed > 0) logger.info({ relayed }, 'audit events relayed');
    else await new Promise((resolve) => setTimeout(resolve, 1000));
  }
})();

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'worker shutting down');
  running = false;
  await relayLoop;
  await worker.close();
  await queue.close();
  await Promise.allSettled([pool.end(), connection.quit(), mongo.close()]);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
