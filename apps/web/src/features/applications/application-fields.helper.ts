import { BsDateHelper } from '@ward-sewa/nepal-utils';
import { m } from '@/paraglide/messages.js';
import type { FormField } from './types.ts';

export class ApplicationFieldsHelper {
  // Drafts may be incomplete, so only filled-in values are checked here.
  static errors(
    fields: readonly FormField[],
    values: Record<string, string>,
  ): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const field of fields) {
      const value = values[field.key]?.trim() ?? '';
      if (field.type === 'date_bs' && value && !BsDateHelper.isValidText(value)) {
        errors[field.key] = m.field_bs_date_invalid();
      }
    }
    return errors;
  }

  // Sends only the fields this service type defines, without empty strings.
  static payload(
    fields: readonly FormField[],
    values: Record<string, string>,
  ): Record<string, string> {
    return Object.fromEntries(
      fields
        .map((field) => [field.key, values[field.key]?.trim() ?? ''] as const)
        .filter(([, value]) => value !== ''),
    );
  }
}
