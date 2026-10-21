import { describe, expect, it } from 'vitest';
import type { FormField } from '../../../src/db/schema/index.ts';
import { FormDataHelper } from '../../../src/modules/service-types/form-data.helper.ts';

const fields: FormField[] = [
  { key: 'relativeName', labelEn: 'Name', labelNe: 'नाम', type: 'text', required: true },
  { key: 'since', labelEn: 'Since', labelNe: 'देखि', type: 'date_bs', required: false },
];
const draft = FormDataHelper.schema(fields, { complete: false });
const complete = FormDataHelper.schema(fields, { complete: true });

describe('FormDataHelper.schema', () => {
  it('accepts a partial draft', () => {
    expect(draft.parse({})).toEqual({});
  });

  it('requires required fields only when complete', () => {
    expect(() => complete.parse({})).toThrow();
    expect(complete.parse({ relativeName: ' Sita ' })).toEqual({ relativeName: 'Sita' });
  });

  it('normalises BS dates, including Devanagari digits', () => {
    expect(draft.parse({ since: '२०७५-३-१' })).toEqual({ since: '2075-03-01' });
  });

  it('rejects impossible BS dates', () => {
    expect(() => draft.parse({ since: '2083-01-32' })).toThrow(/valid BS date/);
  });

  it('rejects fields the service type does not define', () => {
    expect(() => draft.parse({ salary: '1000' })).toThrow();
  });
});
