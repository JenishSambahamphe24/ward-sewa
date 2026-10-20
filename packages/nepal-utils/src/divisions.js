import data from './data/divisions.json' with { type: 'json' };

const freeze = (value) => Object.freeze(value);

/** Nepal's 7 provinces, each with its districts (English names). */
export const provinces = freeze(
  data.provinces.map((p) => freeze({ ...p, districts: freeze([...p.districts]) })),
);

export const districts = freeze(
  provinces.flatMap((p) => p.districts.map((name) => freeze({ name, provinceId: p.id }))),
);

export function getProvince(id) {
  return provinces.find((p) => p.id === id) ?? null;
}

/** Case-insensitive district lookup by English name. */
export function findDistrict(name) {
  const needle = String(name).trim().toLowerCase();
  return districts.find((d) => d.name.toLowerCase() === needle) ?? null;
}
