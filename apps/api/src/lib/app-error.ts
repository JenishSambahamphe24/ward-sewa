export type ErrorCode =
  'NOT_FOUND' | 'VALIDATION_FAILED' | 'MALFORMED_JSON' | 'PAYLOAD_TOO_LARGE' | 'INTERNAL_ERROR';

/** `message` and `details` are sent to the client, so they must never contain internals. */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
