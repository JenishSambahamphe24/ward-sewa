import { ApiError } from '@/lib/api-client.ts';
import { ApiErrorHelper } from '@/lib/api-error.helper.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';

export class StaffErrorHelper {
  // The API marks which 409 it is in details.reason; both share the CONFLICT code.
  static message(error: unknown, wardNo: number | null): string {
    const details =
      error instanceof ApiError ? (error.details as { reason?: string } | null) : null;
    if (details?.reason === 'ward_has_chair' && wardNo !== null) {
      return m.staff_error_ward_has_chair({ ward: LocaleHelper.digits(wardNo) });
    }
    if (details?.reason === 'phone_is_staff') return m.staff_error_phone_is_staff();
    return ApiErrorHelper.message(error);
  }
}
