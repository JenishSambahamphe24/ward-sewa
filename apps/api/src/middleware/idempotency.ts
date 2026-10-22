import { createHash } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { AppError } from '../lib/app-error.ts';

const PROCESSING_TTL_SECONDS = 60;
export const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
const KEY_FORMAT = /^[A-Za-z0-9_-]{8,128}$/;

type Entry =
  | { state: 'processing'; fingerprint: string }
  | { state: 'done'; fingerprint: string; status: number; body: unknown };

// A retried POST with the same Idempotency-Key replays the first response instead of acting
// twice. Keys are per user, so one citizen can never receive another's stored response.
export function idempotent(redis: Redis, logger: Logger): RequestHandler {
  return async (req, res, next) => {
    const key = req.get('Idempotency-Key');
    if (key === undefined) return next();
    if (!KEY_FORMAT.test(key)) {
      throw new AppError(
        400,
        'VALIDATION_FAILED',
        'Idempotency-Key must be 8-128 letters, digits, - or _',
      );
    }
    if (redis.status !== 'ready') {
      logger.warn('idempotency skipped: redis unavailable');
      return next();
    }

    const redisKey = `idem:${req.user?.id ?? 'anon'}:${key}`;
    const fingerprint = createHash('sha256')
      .update(`${req.method} ${req.originalUrl} ${JSON.stringify(req.body ?? null)}`)
      .digest('hex');
    const claimed = await redis.set(
      redisKey,
      JSON.stringify({ state: 'processing', fingerprint } satisfies Entry),
      'EX',
      PROCESSING_TTL_SECONDS,
      'NX',
    );

    if (!claimed) {
      const entry = JSON.parse((await redis.get(redisKey)) ?? 'null') as Entry | null;
      if (entry && entry.fingerprint !== fingerprint) {
        throw new AppError(
          422,
          'IDEMPOTENCY_KEY_REUSED',
          'This Idempotency-Key was used for a different request',
        );
      }
      if (entry?.state === 'done') {
        res.set('Idempotent-Replayed', 'true').status(entry.status).json(entry.body);
        return;
      }
      throw new AppError(
        409,
        'CONFLICT',
        'A request with this Idempotency-Key is still being processed',
        {
          headers: { 'Retry-After': '1' },
        },
      );
    }

    rememberResponse(
      res,
      async (status, body) => {
        if (status >= 200 && status < 300) {
          const done: Entry = { state: 'done', fingerprint, status, body };
          await redis.set(redisKey, JSON.stringify(done), 'EX', IDEMPOTENCY_TTL_SECONDS);
        } else {
          await redis.del(redisKey);
        }
      },
      logger,
    );
    next();
  };
}

// Stores the outcome before the response leaves, so a fast retry never finds it "processing".
function rememberResponse(
  res: Response,
  store: (status: number, body: unknown) => Promise<void>,
  logger: Logger,
): void {
  const send = res.json.bind(res);
  res.json = (body: unknown) => {
    store(res.statusCode, body)
      .catch((err: Error) =>
        logger.warn({ err: err.message }, 'could not store idempotent response'),
      )
      .finally(() => send(body));
    return res;
  };
}
