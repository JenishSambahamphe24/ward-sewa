import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/app-error.ts';

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`));
}

function toAppError(err: unknown): AppError | null {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    return new AppError(400, 'VALIDATION_FAILED', 'Request validation failed', err.issues);
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

  const { status, code, message, details } = appError;
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}
