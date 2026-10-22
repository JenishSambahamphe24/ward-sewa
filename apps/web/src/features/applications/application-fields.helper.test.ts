import { describe, expect, it } from 'vitest';
import { m } from '@/paraglide/messages.js';
import { ApplicationFieldsHelper } from './application-fields.helper.ts';
import type { FormField } from './types.ts';

const fields: FormField[] = [
  { key: 'residingSince', labelEn: 'Since', labelNe: 'देखि', type: 'date_bs', required: true },
  { key: 'note', labelEn: 'Note', labelNe: 'नोट', type: 'text', required: false },
];

describe('ApplicationFieldsHelper', () => {
  it('flags an impossible BS date but accepts Devanagari digits', () => {
    expect(ApplicationFieldsHelper.errors(fields, { residingSince: '2083-01-32' })).toEqual({
      residingSince: m.field_bs_date_invalid(),
    });
    expect(ApplicationFieldsHelper.errors(fields, { residingSince: '२०७५-३-१५' })).toEqual({});
  });

  it('lets a draft leave fields empty', () => {
    expect(ApplicationFieldsHelper.errors(fields, {})).toEqual({});
  });

  it('sends only defined, non-empty fields', () => {
    expect(
      ApplicationFieldsHelper.payload(fields, {
        residingSince: ' 2075-03-15 ',
        note: '',
        salary: '9',
      }),
    ).toEqual({ residingSince: '2075-03-15' });
  });
});
