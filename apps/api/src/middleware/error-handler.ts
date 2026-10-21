import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/app-error.ts';

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`));
}

// Drizzle wraps driver errors; the PostgreSQL SQLSTATE is on `cause.code`.
function postgresCode(err: unknown): string | undefined {
  const cause = err instanceof Error ? err.cause : undefined;
  return typeof cause === 'object' && cause !== null && 'code' in cause
    ? String(cause.code)
    : undefined;
}

function toAppError(err: unknown): AppError | null {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    return new AppError(400, 'VALIDATION_FAILED', 'Request validation failed', {
      details: err.issues,
    });
  }
  switch (postgresCode(err)) {
    case '23505':
      return new AppError(409, 'CONFLICT', 'A record with these details already exists');
    case '23503':
      return new AppError(400, 'VALIDATION_FAILED', 'A referenced record does not exist');
  }
  if (typeof err === 'object' && err !== null && 'type' in err) {
    if (err.type === 'entity.parse.failed') {
      return new AppError(400, 'MALFORMED_JSON', 'Request body is not valid JSON');
    }
    if (err.type === 'entity.too.large') {
      return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    }
  }
  return null;
}

// Express recognises error middleware by its four parameters, so `_next` must stay.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response<ErrorBody>,
  _next: NextFunction,
): void {
  let appError = toAppError(err);
  if (!appError) {
    req.log.error({ err }, 'unhandled error');
    appError = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
  }

  const { status, code, message, details, headers } = appError;
  res.set(headers);
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}
