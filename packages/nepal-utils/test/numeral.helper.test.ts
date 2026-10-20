import { describe, expect, it } from 'vitest';
import { NumeralHelper } from '../src/index.ts';

describe('NumeralHelper', () => {
  it('converts both ways and leaves other characters alone', () => {
    expect(NumeralHelper.toNepali(2083)).toBe('२०८३');
    expect(NumeralHelper.toNepali('Ward 05')).toBe('Ward ०५');
    expect(NumeralHelper.toEnglish('वडा नं. १२')).toBe('वडा नं. 12');
    expect(NumeralHelper.toEnglish(NumeralHelper.toNepali('0123456789'))).toBe('0123456789');
  });
});
