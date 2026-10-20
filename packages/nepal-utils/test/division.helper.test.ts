import { describe, expect, it } from 'vitest';
import { DivisionHelper } from '../src/index.ts';

const { provinces, districts, localLevels } = DivisionHelper;

describe('DivisionHelper', () => {
  it('matches the published totals', () => {
    expect(provinces).toHaveLength(7);
    expect(districts).toHaveLength(77);
    expect(localLevels).toHaveLength(753);
    expect(localLevels.reduce((total, l) => total + l.wards, 0)).toBe(6743);
  });

  it('has 6 metropolitan, 11 sub-metropolitan, 276 municipal and 460 rural local levels', () => {
    const count = (type: string) => localLevels.filter((l) => l.type === type).length;
    expect(count('metropolitan')).toBe(6);
    expect(count('sub_metropolitan')).toBe(11);
    expect(count('municipality')).toBe(276);
    expect(count('rural_municipality')).toBe(460);
  });

  it('gives every local level between 5 and 33 wards', () => {
    expect(localLevels.every((l) => l.wards >= 5 && l.wards <= 33)).toBe(true);
  });

  it('links every district and local level to an existing parent', () => {
    expect(districts.every((d) => provinces.some((p) => p.code === d.provinceCode))).toBe(true);
    expect(localLevels.every((l) => DivisionHelper.getDistrict(l.districtCode))).toBe(true);
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
    const province = DivisionHelper.getProvince(id);
    expect(DivisionHelper.districtsOf(province?.code ?? '')).toHaveLength(count);
  });

  it('looks up Kathmandu Metropolitan City', () => {
    expect(DivisionHelper.getLocalLevel('NP0327101')).toEqual({
      code: 'NP0327101',
      name: 'Kathmandu',
      type: 'metropolitan',
      districtCode: 'NP0327',
      wards: 32,
    });
    expect(DivisionHelper.localLevelsOf('NP0327')).toHaveLength(11);
    expect(DivisionHelper.getLocalLevel('NP9999999')).toBeNull();
  });

  it('looks up districts case-insensitively', () => {
    expect(DivisionHelper.findDistrict('  kathmandu ')?.code).toBe('NP0327');
    expect(DivisionHelper.findDistrict('Atlantis')).toBeNull();
    expect(DivisionHelper.getDistrict('NP9999')).toBeNull();
    expect(DivisionHelper.getProvince(8)).toBeNull();
  });

  it('is immutable so callers cannot corrupt shared data', () => {
    for (const list of [provinces, districts, localLevels]) {
      expect(Object.isFrozen(list)).toBe(true);
      expect(list.every((item) => Object.isFrozen(item))).toBe(true);
    }
  });
});
