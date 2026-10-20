import { Router } from 'express';
import { BsDateHelper } from '@ward-sewa/nepal-utils';
import { PromiseHelper } from '../../lib/promise.helper.ts';

/** Resolves when the dependency is reachable, rejects otherwise. */
export type HealthCheck = () => Promise<unknown>;

export interface HealthRouterOptions {
  timeoutMs?: number;
}

type DependencyStatus = { status: 'up'; latencyMs: number } | { status: 'down' };

export function healthRouter(
  checks: Record<string, HealthCheck>,
  { timeoutMs = 2000 }: HealthRouterOptions = {},
): Router {
  const router = Router();

  // Liveness never touches dependencies, so a database outage doesn't make the
  // orchestrator restart healthy API containers.
  router.get('/health/live', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/health/ready', async (req, res) => {
    const entries = await Promise.all(
      Object.entries(checks).map(async ([name, check]): Promise<[string, DependencyStatus]> => {
        const started = performance.now();
        try {
          await PromiseHelper.withTimeout(check(), timeoutMs);
          return [name, { status: 'up', latencyMs: Math.round(performance.now() - started) }];
        } catch (err) {
          req.log.warn({ dependency: name, err: (err as Error).message }, 'health check failed');
          return [name, { status: 'down' }];
        }
      }),
    );
    const ready = entries.every(([, result]) => result.status === 'up');

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ok' : 'degraded',
      dateBs: BsDateHelper.format(BsDateHelper.today()),
      dependencies: Object.fromEntries(entries),
    });
  });

  return router;
}
