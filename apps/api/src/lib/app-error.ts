export type ErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'MALFORMED_JSON'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface AppErrorOptions {
  details?: unknown;
  headers?: Record<string, string>;
}

/** `message` and `details` are sent to the client, so they must never contain internals. */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: unknown;
  readonly headers: Record<string, string>;

  constructor(status: number, code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = options.details;
    this.headers = options.headers ?? {};
  }
}
