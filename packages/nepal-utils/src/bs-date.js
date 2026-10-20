import calendar from './data/bs-calendar.json' with { type: 'json' };
import { toEnglishDigits, toNepaliDigits } from './numerals.js';

/** @typedef {{ year: number, month: number, day: number }} SimpleDate  month is 1-12 */

export const BS_MIN_YEAR = calendar.minYear;
export const BS_MAX_YEAR = calendar.maxYear;

export const BS_MONTHS_EN = [
  'Baisakh',
  'Jestha',
  'Asar',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];
export const BS_MONTHS_NE = [
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कार्तिक',
  'मंसिर',
  'पुस',
  'माघ',
  'फागुन',
  'चैत',
];
export const WEEKDAYS_NE = [
  'आइतबार',
  'सोमबार',
  'मंगलबार',
  'बुधबार',
  'बिहीबार',
  'शुक्रबार',
  'शनिबार',
];

// BS 2000-01-01 is AD 1943-04-14. All AD arithmetic is done in UTC so the
// host's timezone can never shift a date.
const EPOCH_UTC = Date.UTC(1943, 3, 14);
const DAY_MS = 86_400_000;
// Nepal Standard Time is UTC+05:45 with no daylight saving.
const NPT_OFFSET_MS = (5 * 60 + 45) * 60_000;

// yearStartDays[i] = days from the epoch to 1 Baisakh of (BS_MIN_YEAR + i).
// The extra final entry marks the end of the supported range.
const yearStartDays = [0];
for (let year = BS_MIN_YEAR; year <= BS_MAX_YEAR; year++) {
  const length = calendar.monthLengths[year].reduce((a, b) => a + b, 0);
  yearStartDays.push(yearStartDays.at(-1) + length);
}
const TOTAL_DAYS = yearStartDays.at(-1);

function assertInteger(name, value) {
  if (!Number.isInteger(value)) throw new TypeError(`${name} must be an integer, got ${value}`);
}

/** Number of days in a BS month. */
export function daysInBsMonth(year, month) {
  assertInteger('year', year);
  assertInteger('month', month);
  if (year < BS_MIN_YEAR || year > BS_MAX_YEAR) {
    throw new RangeError(
      `BS year ${year} is outside the supported range ${BS_MIN_YEAR}–${BS_MAX_YEAR}`,
    );
  }
  if (month < 1 || month > 12) throw new RangeError(`month must be 1-12, got ${month}`);
  return calendar.monthLengths[year][month - 1];
}

export function isValidBsDate({ year, month, day }) {
  try {
    assertInteger('day', day);
    return day >= 1 && day <= daysInBsMonth(year, month);
  } catch {
    return false;
  }
}

function assertValidBsDate(date) {
  const max = daysInBsMonth(date.year, date.month);
  assertInteger('day', date.day);
  if (date.day < 1 || date.day > max) {
    throw new RangeError(
      `${BS_MONTHS_EN[date.month - 1]} ${date.year} has ${max} days, got day ${date.day}`,
    );
  }
}

/** @param {SimpleDate} bs  @returns {SimpleDate} */
export function bsToAd(bs) {
  assertValidBsDate(bs);
  const months = calendar.monthLengths[bs.year];
  let days = yearStartDays[bs.year - BS_MIN_YEAR] + bs.day - 1;
  for (let m = 0; m < bs.month - 1; m++) days += months[m];
  const ad = new Date(EPOCH_UTC + days * DAY_MS);
  return { year: ad.getUTCFullYear(), month: ad.getUTCMonth() + 1, day: ad.getUTCDate() };
}

/** @param {SimpleDate} ad  @returns {SimpleDate} */
export function adToBs(ad) {
  for (const key of ['year', 'month', 'day']) assertInteger(key, ad[key]);
  const utc = Date.UTC(ad.year, ad.month - 1, ad.day);
  const check = new Date(utc);
  if (check.getUTCMonth() !== ad.month - 1 || check.getUTCDate() !== ad.day) {
    throw new RangeError(`${ad.year}-${ad.month}-${ad.day} is not a valid AD date`);
  }

  let remaining = (utc - EPOCH_UTC) / DAY_MS;
  if (remaining < 0 || remaining >= TOTAL_DAYS) {
    throw new RangeError(`AD date is outside the supported BS range ${BS_MIN_YEAR}–${BS_MAX_YEAR}`);
  }

  let yearIndex = 0;
  while (yearStartDays[yearIndex + 1] <= remaining) yearIndex++;
  remaining -= yearStartDays[yearIndex];

  const year = BS_MIN_YEAR + yearIndex;
  const months = calendar.monthLengths[year];
  let month = 0;
  while (remaining >= months[month]) remaining -= months[month++];
  return { year, month: month + 1, day: remaining + 1 };
}

/** Converts a JS Date (an instant) to its BS date in Nepal Standard Time. */
export function instantToBs(instant) {
  const npt = new Date(instant.getTime() + NPT_OFFSET_MS);
  return adToBs({
    year: npt.getUTCFullYear(),
    month: npt.getUTCMonth() + 1,
    day: npt.getUTCDate(),
  });
}

/** Today's BS date in Nepal, regardless of the server's timezone. */
export function todayBs(now = new Date()) {
  return instantToBs(now);
}

/** 0 = Sunday (आइतबार) … 6 = Saturday (शनिबार). */
export function bsWeekday(bs) {
  const ad = bsToAd(bs);
  return new Date(Date.UTC(ad.year, ad.month - 1, ad.day)).getUTCDay();
}

/** Parses "YYYY-MM-DD" (ASCII or Devanagari digits) into a validated BS date. */
export function parseBsDate(text) {
  const normalized = toEnglishDigits(text).trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  if (!match) throw new RangeError(`Expected a BS date as YYYY-MM-DD, got "${text}"`);
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  assertValidBsDate(date);
  return date;
}

/**
 * @param {SimpleDate} bs
 * @param {{ locale?: 'en' | 'ne', style?: 'iso' | 'long' }} [options]
 *   iso  → 2083-07-04 / २०८३-०७-०४
 *   long → 4 Kartik 2083 / २०८३ कार्तिक ४
 */
export function formatBs(bs, { locale = 'en', style = 'iso' } = {}) {
  assertValidBsDate(bs);
  if (style === 'iso') {
    const iso = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
    return locale === 'ne' ? toNepaliDigits(iso) : iso;
  }
  if (style === 'long') {
    return locale === 'ne'
      ? `${toNepaliDigits(bs.year)} ${BS_MONTHS_NE[bs.month - 1]} ${toNepaliDigits(bs.day)}`
      : `${bs.day} ${BS_MONTHS_EN[bs.month - 1]} ${bs.year}`;
  }
  throw new RangeError(`Unknown style "${style}"`);
}

/** Nepal's fiscal year runs from 1 Shrawan to the end of Asar, e.g. "2083/84". */
export function bsFiscalYear(bs) {
  assertValidBsDate(bs);
  const startYear = bs.month >= 4 ? bs.year : bs.year - 1;
  const endYear = startYear + 1;
  return { startYear, endYear, label: `${startYear}/${String(endYear % 100).padStart(2, '0')}` };
}
