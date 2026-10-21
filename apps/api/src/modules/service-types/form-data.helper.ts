import { BsDateHelper } from '@ward-sewa/nepal-utils';
import { z } from 'zod';
import type { FormField } from '../../db/schema/index.ts';

const text = z.string().trim().min(1).max(200);

const bsDate = z.string().transform((value, ctx) => {
  try {
    return BsDateHelper.format(BsDateHelper.parse(value));
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Expected a valid BS date as YYYY-MM-DD' });
    return z.NEVER;
  }
});

export class FormDataHelper {
  // Drafts may be partial; `complete` (used on submit) makes required fields mandatory.
  static schema(
    fields: readonly FormField[],
    { complete }: { complete: boolean },
  ): z.ZodType<Record<string, string>> {
    const shape = Object.fromEntries(
      fields.map((field) => {
        const value = field.type === 'date_bs' ? bsDate : text;
        return [field.key, complete && field.required ? value : value.optional()];
      }),
    );
    return z
      .strictObject(shape)
      .transform(
        (data) =>
          Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== undefined),
          ) as Record<string, string>,
      );
  }
}
