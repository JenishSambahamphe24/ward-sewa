// Builds src/data/divisions.json from two official sources:
//   - Survey Department of Nepal boundaries (via OCHA HDX, CC BY-IGO): codes, names, types
//   - National Statistics Office, Census 2021 ward tables: wards per local level
// Fails on any count mismatch or unmatched name instead of guessing.
//
// Usage: pnpm build:divisions

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readSheet } from 'read-excel-file/node';
import type { SheetData } from 'read-excel-file/node';
import type { LocalLevelType } from '../src/types.ts';

const BOUNDARIES_URL =
  'https://data.humdata.org/dataset/07db728a-4f0f-4e98-8eb0-8fa9df61f01c/resource/5bf18581-ef08-471c-b5d4-582c2d70228d/download/npl_admin_boundaries.xlsx';
const censusUrl = (province: number) =>
  `https://censusresults.nsonepal.gov.np/files/ward/P${province}/Indv_SexRatioChildAndTotal_Ward.xlsx`;

// Published totals: 7 provinces, 77 districts, 753 local levels, 6,743 wards.
const EXPECTED = { provinces: 7, districts: 77, localLevels: 753, wards: 6743 };

// The digit after the district code (NP0327|1|01) is the type; 5 is a protected area.
const TYPE_BY_DIGIT: Record<string, LocalLevelType> = {
  '1': 'metropolitan',
  '2': 'sub_metropolitan',
  '3': 'municipality',
  '4': 'rural_municipality',
};

// Census name → Survey Department name, after normalising.
const ALIASES: Record<string, string> = {
  nawalparasibardaghatsustaeast: 'nawalparasieast',
  nawalparasibardaghatsustawest: 'nawalparasiwest',
  melanchi: 'melamchi',
  manangngisyang: 'ngisyang',
};

interface Source {
  name: string;
  url: string;
  license: string;
  sha256: string;
}

const sources: Source[] = [];

async function download(url: string, name: string, license: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { 'User-Agent': 'ward-sewa build-divisions' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  sources.push({ name, url, license, sha256: createHash('sha256').update(buffer).digest('hex') });
  return buffer;
}

function records(rows: SheetData): Record<string, string>[] {
  const [header = [], ...body] = rows;
  return body.map((row) =>
    Object.fromEntries(header.map((key, i) => [String(key), String(row[i] ?? '').trim()])),
  );
}

function normalise(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/\b(gaunpalika|sub-metropolit[a-z]*|metropolit[a-z]*|municipality|city)\b/g, '')
    .replace(/[^a-z]/g, '');
  return ALIASES[key] ?? key;
}

function assertEqual(label: string, actual: number, expected: number): void {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

const boundaries = await download(
  BOUNDARIES_URL,
  'Survey Department of Nepal, Nepal Subnational Administrative Boundaries v02 (OCHA HDX cod-ab-npl)',
  'CC BY-IGO 3.0',
);
const adm1 = records(await readSheet(boundaries, 'npl_admin1'));
const adm2 = records(await readSheet(boundaries, 'npl_admin2'));
const adm3 = records(await readSheet(boundaries, 'npl_admin3'));

const provinces = adm1
  .map((r) => ({ id: Number(r.adm1_pcode?.slice(2)), code: r.adm1_pcode, name: r.adm1_name }))
  .sort((a, b) => a.id - b.id);
const districts = adm2
  .map((r) => ({ code: r.adm2_pcode, name: r.adm2_name, provinceCode: r.adm1_pcode }))
  .sort((a, b) => String(a.code).localeCompare(String(b.code)));
const localLevels = adm3
  .filter((r) => r.adm3_pcode?.[6] !== '5')
  .map((r) => {
    const code = String(r.adm3_pcode);
    const type = TYPE_BY_DIGIT[code[6] ?? ''];
    if (!type) throw new Error(`${code}: unknown type digit`);
    return { code, name: String(r.adm3_name), type, districtCode: String(r.adm2_pcode), wards: 0 };
  })
  .sort((a, b) => a.code.localeCompare(b.code));

assertEqual('provinces', provinces.length, EXPECTED.provinces);
assertEqual('districts', districts.length, EXPECTED.districts);
assertEqual('local levels', localLevels.length, EXPECTED.localLevels);

const districtByName = new Map(districts.map((d) => [normalise(String(d.name)), d.code]));
const localLevelByKey = new Map(
  localLevels.map((l) => [`${l.districtCode}:${normalise(l.name)}`, l]),
);
const censusSuffixByType: Record<LocalLevelType, string> = {
  metropolitan: 'City',
  sub_metropolitan: 'City',
  municipality: 'Municipality',
  rural_municipality: 'Gaunpalika',
};

for (let province = 1; province <= EXPECTED.provinces; province++) {
  const rows = await readSheet(
    await download(
      censusUrl(province),
      `National Statistics Office, National Population and Housing Census 2021, ward table P${province}`,
      'Government of Nepal publication; licence not stated',
    ),
  );
  const districtNames = new Map<string, string>();
  const wardsSeen = new Map<string, number[]>();

  for (const row of rows) {
    const [, dist, gapa, area, ward] = row.map((cell) => String(cell ?? '').trim());
    if (!/^\d+$/.test(dist ?? '') || dist === '0' || !area) continue;
    if (gapa === '0') {
      districtNames.set(dist ?? '', area);
      continue;
    }
    const districtCode = districtByName.get(normalise(districtNames.get(dist ?? '') ?? ''));
    const localLevel = localLevelByKey.get(`${districtCode}:${normalise(area)}`);
    if (!localLevel) throw new Error(`Census local level "${area}" has no Survey Department match`);
    if (!area.endsWith(censusSuffixByType[localLevel.type])) {
      throw new Error(`"${area}" disagrees with ${localLevel.code} (${localLevel.type})`);
    }
    if (ward === 'Total') continue;
    const seen = wardsSeen.get(localLevel.code) ?? [];
    seen.push(Number(ward));
    wardsSeen.set(localLevel.code, seen);
  }

  for (const [code, wards] of wardsSeen) {
    if (wards.some((w, i) => w !== i + 1)) throw new Error(`${code}: wards are not 1..N`);
    const localLevel = localLevels.find((l) => l.code === code);
    if (localLevel) localLevel.wards = wards.length;
  }
}

const missing = localLevels.filter((l) => l.wards === 0).map((l) => `${l.code} ${l.name}`);
if (missing.length > 0) throw new Error(`No census wards for: ${missing.join(', ')}`);
assertEqual(
  'wards',
  localLevels.reduce((total, l) => total + l.wards, 0),
  EXPECTED.wards,
);

// One entry per line keeps the diff reviewable when a source updates.
const lines = (items: object[]) => items.map((item) => `    ${JSON.stringify(item)}`).join(',\n');
const json = `{
  "retrieved": ${JSON.stringify(new Date().toISOString().slice(0, 10))},
  "sources": [
${lines(sources)}
  ],
  "provinces": [
${lines(provinces)}
  ],
  "districts": [
${lines(districts)}
  ],
  "localLevels": [
${lines(localLevels)}
  ]
}
`;

const outPath = fileURLToPath(new URL('../src/data/divisions.json', import.meta.url));
writeFileSync(outPath, json);
console.log(
  `Wrote ${provinces.length} provinces, ${districts.length} districts, ${localLevels.length} local levels, ${EXPECTED.wards} wards`,
);
