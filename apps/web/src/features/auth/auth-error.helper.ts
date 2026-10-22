import { ApiError } from '@/lib/api-client.ts';
import { m } from '@/paraglide/messages.js';

// Server messages are English and technical; the UI shows its own text in the chosen language.
export class AuthErrorHelper {
  static message(error: unknown): string {
    if (!(error instanceof ApiError)) return m.error_generic();
    if (error.code === 'RATE_LIMITED') {
      return m.error_rate_limited({ minutes: Math.ceil((error.retryAfterSeconds ?? 60) / 60) });
    }
    if (error.code === 'UNAUTHENTICATED') return m.login_code_invalid();
    if (error.code === 'FORBIDDEN') return m.login_deactivated();
    if (error.code === 'VALIDATION_FAILED') return m.login_phone_invalid();
    return m.error_generic();
  }
}
