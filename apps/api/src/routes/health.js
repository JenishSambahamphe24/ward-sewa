import { Router } from 'express';
import { formatBs, todayBs } from '@ward-sewa/nepal-utils';

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * @param {Record<string, () => Promise<unknown>>} checks  name → function that rejects when unhealthy
 * @param {{ timeoutMs?: number }} [options]
 */
export function healthRouter(checks, { timeoutMs = 2000 } = {}) {
  const router = Router();

  // Liveness: the process is up. Never touches dependencies, so a database
  // outage doesn't make the orchestrator restart healthy API containers.
  router.get('/health/live', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Readiness: every dependency answers. Returns 503 if any one fails.
  router.get('/health/ready', async (req, res) => {
    const entries = await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        const started = performance.now();
        try {
          await withTimeout(check(), timeoutMs);
          return [name, { status: 'up', latencyMs: Math.round(performance.now() - started) }];
        } catch (err) {
          req.log.warn({ dependency: name, err: err.message }, 'health check failed');
          return [name, { status: 'down' }];
        }
      }),
    );
    const dependencies = Object.fromEntries(entries);
    const ready = entries.every(([, result]) => result.status === 'up');

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ok' : 'degraded',
      dateBs: formatBs(todayBs()),
      dependencies,
    });
  });

  return router;
}
