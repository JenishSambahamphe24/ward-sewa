import express from 'express';
import { pinoHttp } from 'pino-http';
import { errorHandler, notFound } from './lib/errors.js';
import { healthRouter } from './routes/health.js';

/**
 * Builds the Express app from its dependencies. Nothing here opens a connection,
 * so tests can pass in fakes and production can pass in real clients.
 *
 * @param {{
 *   logger: import('pino').Logger,
 *   healthChecks: Record<string, () => Promise<unknown>>,
 *   healthTimeoutMs?: number,
 * }} deps
 */
export function createApp({ logger, healthChecks, healthTimeoutMs }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '100kb' }));

  app.use(healthRouter(healthChecks, { timeoutMs: healthTimeoutMs }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
