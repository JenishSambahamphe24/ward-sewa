// Extracts the Bikram Sambat month-length table from nepali-date-converter's
// date-config.js and writes it as JSON. The file is parsed as text, never executed.
//
// Usage: node scripts/build-calendar.js <path-to-date-config.js>

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
  console.error('Usage: node scripts/build-calendar.js <path-to-date-config.js>');
  process.exit(1);
}

const text = readFileSync(sourcePath, 'utf8');
const yearBlock = /'(\d{4})':\s*\{([^}]*)\}/g;
const years = {};

for (const [, year, body] of text.matchAll(yearBlock)) {
  const lengths = MONTH_KEYS.map((key) => {
    const match = body.match(new RegExp(`${key}:\\s*(\\d+)`));
    if (!match) throw new Error(`BS ${year}: missing ${key}`);
    const days = Number(match[1]);
    if (days < 29 || days > 32) throw new Error(`BS ${year} ${key}: implausible length ${days}`);
    return days;
  });
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total < 365 || total > 366) throw new Error(`BS ${year}: implausible year length ${total}`);
  years[year] = lengths;
}

const yearNumbers = Object.keys(years)
  .map(Number)
  .sort((a, b) => a - b);
for (let i = 1; i < yearNumbers.length; i++) {
  if (yearNumbers[i] !== yearNumbers[i - 1] + 1) {
    throw new Error(`Gap in table after BS ${yearNumbers[i - 1]}`);
  }
}

const output = {
  source: 'nepali-date-converter@3.4.0 (https://github.com/subeshb1/Nepali-Date), MIT License',
  minYear: yearNumbers[0],
  maxYear: yearNumbers.at(-1),
  monthLengths: years,
};

const outPath = fileURLToPath(new URL('../src/data/bs-calendar.json', import.meta.url));
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
console.log(
  `Wrote BS ${output.minYear}–${output.maxYear} (${yearNumbers.length} years) to ${outPath}`,
);
