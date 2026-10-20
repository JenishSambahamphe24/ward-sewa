import data from './data/divisions.json' with { type: 'json' };
import type { District, LocalLevel, Province } from './types.ts';

const freezeAll = <T extends object>(items: T[]): readonly Readonly<T>[] =>
  Object.freeze(items.map((item) => Object.freeze(item)));

const provinces = freezeAll<Province>(data.provinces);
const districts = freezeAll<District>(data.districts);
const localLevels = freezeAll(data.localLevels as LocalLevel[]);

export class DivisionHelper {
  static readonly provinces = provinces;
  static readonly districts = districts;
  static readonly localLevels = localLevels;

  static getProvince(id: number): Province | null {
    return provinces.find((p) => p.id === id) ?? null;
  }

  static getDistrict(code: string): District | null {
    return districts.find((d) => d.code === code) ?? null;
  }

  static getLocalLevel(code: string): LocalLevel | null {
    return localLevels.find((l) => l.code === code) ?? null;
  }

  static districtsOf(provinceCode: string): readonly District[] {
    return districts.filter((d) => d.provinceCode === provinceCode);
  }

  static localLevelsOf(districtCode: string): readonly LocalLevel[] {
    return localLevels.filter((l) => l.districtCode === districtCode);
  }

  /** Case-insensitive, ignores surrounding whitespace. */
  static findDistrict(name: string): District | null {
    const needle = name.trim().toLowerCase();
    return districts.find((d) => d.name.toLowerCase() === needle) ?? null;
  }
}
