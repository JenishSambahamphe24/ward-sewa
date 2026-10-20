import express from 'express';
import type { Express } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { errorHandler, notFound } from './middleware/error-handler.ts';
import { healthRouter } from './modules/health/health.routes.ts';
import type { HealthCheck } from './modules/health/health.routes.ts';

export interface AppDeps {
  logger: Logger;
  healthChecks: Record<string, HealthCheck>;
  healthTimeoutMs?: number;
}

// Opens no connections: tests pass fakes, server.ts passes real clients.
export function createApp({ logger, healthChecks, healthTimeoutMs }: AppDeps): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '100kb' }));

  app.use(healthRouter(healthChecks, { timeoutMs: healthTimeoutMs }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
