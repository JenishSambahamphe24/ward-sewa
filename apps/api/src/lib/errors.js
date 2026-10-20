import { ZodError } from 'zod';

/** An error that is safe to show to the client. */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`));
}

// Every error leaves the API in the same shape: { error: { code, message, details? } }.
// Unexpected errors are logged in full but never leak internals to the client.
export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    err = new AppError(400, 'VALIDATION_FAILED', 'Request validation failed', err.issues);
  } else if (err.type === 'entity.parse.failed') {
    err = new AppError(400, 'MALFORMED_JSON', 'Request body is not valid JSON');
  }

  if (!(err instanceof AppError)) {
    req.log.error({ err }, 'unhandled error');
    err = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
  }

  res.status(err.status).json({
    error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
  });
}
