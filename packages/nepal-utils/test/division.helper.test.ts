import { describe, expect, it } from 'vitest';
import { DivisionHelper } from '../src/index.ts';

describe('DivisionHelper', () => {
  it('has 7 provinces and 77 unique districts', () => {
    expect(DivisionHelper.provinces).toHaveLength(7);
    expect(DivisionHelper.districts).toHaveLength(77);
    expect(new Set(DivisionHelper.districts.map((d) => d.name)).size).toBe(77);
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
    expect(DivisionHelper.getProvince(id)?.districts).toHaveLength(count);
  });

  it('looks up districts case-insensitively', () => {
    expect(DivisionHelper.findDistrict('  kathmandu ')).toEqual({
      name: 'Kathmandu',
      provinceId: 3,
    });
    expect(DivisionHelper.findDistrict('Atlantis')).toBeNull();
    expect(DivisionHelper.getProvince(8)).toBeNull();
  });

  it('is immutable so callers cannot corrupt shared data', () => {
    const districts = DivisionHelper.provinces[0]?.districts as string[];
    expect(() => districts.push('Atlantis')).toThrow(TypeError);
  });
});
