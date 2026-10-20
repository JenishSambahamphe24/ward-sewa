// Extracts the Bikram Sambat month-length table from nepali-date-converter's
// date-config.js and writes it as JSON. The file is parsed as text, never executed.
//
// Usage: pnpm build:calendar <path-to-date-config.js>

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MONTH_KEYS = [
  'Baisakh',
  'Jestha',
  'Asar',
  'Shrawan',
  'Bhadra',
  'Aswin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Usage: pnpm build:calendar <path-to-date-config.js>');
  process.exit(1);
}

const text = readFileSync(sourcePath, 'utf8');
const yearBlock = /'(\d{4})':\s*\{([^}]*)\}/g;
const years: Record<string, number[]> = {};

for (const [, year, body = ''] of text.matchAll(yearBlock)) {
  const lengths = MONTH_KEYS.map((key) => {
    const match = new RegExp(`${key}:\\s*(\\d+)`).exec(body);
    if (!match) throw new Error(`BS ${year}: missing ${key}`);
    const days = Number(match[1]);
    if (days < 29 || days > 32) throw new Error(`BS ${year} ${key}: implausible length ${days}`);
    return days;
  });
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total < 365 || total > 366) throw new Error(`BS ${year}: implausible year length ${total}`);
  years[String(year)] = lengths;
}

const yearNumbers = Object.keys(years)
  .map(Number)
  .sort((a, b) => a - b);
for (let i = 1; i < yearNumbers.length; i++) {
  const previous = yearNumbers[i - 1] ?? 0;
  if (yearNumbers[i] !== previous + 1) throw new Error(`Gap in table after BS ${previous}`);
}

const output = {
  source: 'nepali-date-converter@3.4.0 (https://github.com/subeshb1/Nepali-Date), MIT License',
  minYear: yearNumbers[0],
  maxYear: yearNumbers.at(-1),
  monthLengths: years,
};

const outPath = fileURLToPath(new URL('../src/data/bs-calendar.json', import.meta.url));
// One year per line, matching Prettier, so regenerating gives a clean diff.
const json = JSON.stringify(output, null, 2).replace(
  /\[\s+([\d,\s]+?)\s+\]/g,
  (_, numbers: string) => `[${numbers.split(/,\s*/).join(', ')}]`,
);
writeFileSync(outPath, json + '\n');
console.log(
  `Wrote BS ${output.minYear}–${output.maxYear} (${yearNumbers.length} years) to ${outPath}`,
);
