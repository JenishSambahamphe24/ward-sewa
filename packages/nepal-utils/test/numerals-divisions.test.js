import { describe, expect, it } from 'vitest';
import {
  districts,
  findDistrict,
  getProvince,
  provinces,
  toEnglishDigits,
  toNepaliDigits,
} from '../src/index.js';

describe('numerals', () => {
  it('converts both ways and leaves other characters alone', () => {
    expect(toNepaliDigits(2083)).toBe('२०८३');
    expect(toNepaliDigits('Ward 05')).toBe('Ward ०५');
    expect(toEnglishDigits('वडा नं. १२')).toBe('वडा नं. 12');
    expect(toEnglishDigits(toNepaliDigits('0123456789'))).toBe('0123456789');
  });
});

describe('administrative divisions', () => {
  it('has 7 provinces and 77 unique districts', () => {
    expect(provinces).toHaveLength(7);
    expect(districts).toHaveLength(77);
    expect(new Set(districts.map((d) => d.name)).size).toBe(77);
  });

  it.each([
    [1, 14],
    [2, 8],
    [3, 13],
    [4, 11],
    [5, 12],
    [6, 10],
    [7, 9],
  ])('province %i has %i districts', (id, count) => {
    expect(getProvince(id).districts).toHaveLength(count);
  });

  it('looks up districts case-insensitively', () => {
    expect(findDistrict('  kathmandu ')).toEqual({ name: 'Kathmandu', provinceId: 3 });
    expect(findDistrict('Atlantis')).toBeNull();
    expect(getProvince(8)).toBeNull();
  });

  it('is immutable so callers cannot corrupt shared data', () => {
    expect(() => provinces[0].districts.push('Atlantis')).toThrow(TypeError);
  });
});
