import { m } from '@/paraglide/messages.js';
import { ApiError } from './api-client.ts';

export class ApiErrorHelper {
  static message(error: unknown): string {
    if (!(error instanceof ApiError)) return m.error_generic();
    if (error.code === 'RATE_LIMITED') {
      return m.error_rate_limited({ minutes: Math.ceil((error.retryAfterSeconds ?? 60) / 60) });
    }
    if (error.code === 'VALIDATION_FAILED') return m.field_invalid();
    return m.error_generic();
  }

  // zod issues carry a path like ["tole"] or ["residingSince"]; key them by their first segment.
  static fieldErrors(error: unknown): Record<string, string> {
    if (!(error instanceof ApiError) || !Array.isArray(error.details)) return {};
    const entries = error.details
      .map((issue: { path?: unknown[] }) => issue.path?.[0])
      .filter((key): key is string => typeof key === 'string')
      .map((key) => [key, m.field_invalid()]);
    return Object.fromEntries(entries);
  }
}
