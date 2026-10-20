import data from './data/divisions.json' with { type: 'json' };
import type { District, Province } from './types.ts';

const provinces: readonly Province[] = Object.freeze(
  data.provinces.map((p) => Object.freeze({ ...p, districts: Object.freeze([...p.districts]) })),
);

const districts: readonly District[] = Object.freeze(
  provinces.flatMap((p) => p.districts.map((name) => Object.freeze({ name, provinceId: p.id }))),
);

export class DivisionHelper {
  static readonly provinces = provinces;
  static readonly districts = districts;

  static getProvince(id: number): Province | null {
    return provinces.find((p) => p.id === id) ?? null;
  }

  /** Case-insensitive, ignores surrounding whitespace. */
  static findDistrict(name: string): District | null {
    const needle = name.trim().toLowerCase();
    return districts.find((d) => d.name.toLowerCase() === needle) ?? null;
  }
}
