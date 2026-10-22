import calendar from './data/bs-calendar.json' with { type: 'json' };
import { NumeralHelper } from './numeral.helper.ts';
import type { BsFormatOptions, FiscalYear, SimpleDate } from './types.ts';

const MIN_YEAR = calendar.minYear;
const MAX_YEAR = calendar.maxYear;

const MONTHS_EN = Object.freeze([
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
]);
const MONTHS_NE = Object.freeze([
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
]);
const WEEKDAYS_NE = Object.freeze([
  'आइतबार',
  'सोमबार',
  'मंगलबार',
  'बुधबार',
  'बिहीबार',
  'शुक्रबार',
  'शनिबार',
]);

// BS 2000-01-01 is AD 1943-04-14. All AD arithmetic is done in UTC so the
// host's timezone can never shift a date.
const EPOCH_UTC = Date.UTC(1943, 3, 14);
const DAY_MS = 86_400_000;
// Nepal Standard Time is UTC+05:45 with no daylight saving.
const NPT_OFFSET_MS = (5 * 60 + 45) * 60_000;

interface CalendarYear {
  year: number;
  /** Days from the epoch to 1 Baisakh of this year. */
  start: number;
  months: readonly number[];
}

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

// Integer-like keys enumerate in ascending order, and build-calendar.ts rejects gaps.
const years: CalendarYear[] = [];
let totalDays = 0;
for (const [year, months] of Object.entries(calendar.monthLengths)) {
  years.push({ year: Number(year), start: totalDays, months });
  totalDays += sum(months);
}

function calendarYear(year: number): CalendarYear {
  const entry = years[year - MIN_YEAR];
  if (!entry) {
    throw new RangeError(`BS year ${year} is outside the supported range ${MIN_YEAR}–${MAX_YEAR}`);
  }
  return entry;
}

function assertInteger(name: string, value: unknown): asserts value is number {
  if (!Number.isInteger(value)) throw new TypeError(`${name} must be an integer, got ${value}`);
}

function assertValid(date: SimpleDate): void {
  const max = BsDateHelper.daysInMonth(date.year, date.month);
  assertInteger('day', date.day);
  if (date.day < 1 || date.day > max) {
    throw new RangeError(
      `${MONTHS_EN[date.month - 1]} ${date.year} has ${max} days, got day ${date.day}`,
    );
  }
}

export class BsDateHelper {
  static readonly MIN_YEAR = MIN_YEAR;
  static readonly MAX_YEAR = MAX_YEAR;
  static readonly MONTHS_EN = MONTHS_EN;
  static readonly MONTHS_NE = MONTHS_NE;
  static readonly WEEKDAYS_NE = WEEKDAYS_NE;

  static daysInMonth(year: number, month: number): number {
    assertInteger('year', year);
    assertInteger('month', month);
    const days = calendarYear(year).months[month - 1];
    if (days === undefined) throw new RangeError(`month must be 1-12, got ${month}`);
    return days;
  }

  static isValid(date: SimpleDate): boolean {
    try {
      assertValid(date);
      return true;
    } catch {
      return false;
    }
  }

  static toAd(bs: SimpleDate): SimpleDate {
    assertValid(bs);
    const { start, months } = calendarYear(bs.year);
    const days = start + sum(months.slice(0, bs.month - 1)) + bs.day - 1;
    const ad = new Date(EPOCH_UTC + days * DAY_MS);
    return { year: ad.getUTCFullYear(), month: ad.getUTCMonth() + 1, day: ad.getUTCDate() };
  }

  static fromAd(ad: SimpleDate): SimpleDate {
    assertInteger('year', ad.year);
    assertInteger('month', ad.month);
    assertInteger('day', ad.day);
    const utc = Date.UTC(ad.year, ad.month - 1, ad.day);
    const check = new Date(utc);
    if (check.getUTCMonth() !== ad.month - 1 || check.getUTCDate() !== ad.day) {
      throw new RangeError(`${ad.year}-${ad.month}-${ad.day} is not a valid AD date`);
    }

    const daysSinceEpoch = (utc - EPOCH_UTC) / DAY_MS;
    const entry = years.findLast((y) => y.start <= daysSinceEpoch);
    if (!entry || daysSinceEpoch >= totalDays) {
      throw new RangeError(`AD date is outside the supported BS range ${MIN_YEAR}–${MAX_YEAR}`);
    }

    let remaining = daysSinceEpoch - entry.start;
    let month = 1;
    for (const length of entry.months) {
      if (remaining < length) break;
      remaining -= length;
      month++;
    }
    return { year: entry.year, month, day: remaining + 1 };
  }

  /** The BS date in Nepal at this instant, whatever the host's timezone. */
  static fromInstant(instant: Date): SimpleDate {
    const npt = new Date(instant.getTime() + NPT_OFFSET_MS);
    return BsDateHelper.fromAd({
      year: npt.getUTCFullYear(),
      month: npt.getUTCMonth() + 1,
      day: npt.getUTCDate(),
    });
  }

  static today(now: Date = new Date()): SimpleDate {
    return BsDateHelper.fromInstant(now);
  }

  /** 0 = Sunday (आइतबार) … 6 = Saturday (शनिबार). */
  static weekday(bs: SimpleDate): number {
    const ad = BsDateHelper.toAd(bs);
    return new Date(Date.UTC(ad.year, ad.month - 1, ad.day)).getUTCDay();
  }

  /** Accepts "YYYY-MM-DD" in ASCII or Devanagari digits. */
  static parse(text: string): SimpleDate {
    const normalized = NumeralHelper.toEnglish(text).trim();
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
    if (!match) throw new RangeError(`Expected a BS date as YYYY-MM-DD, got "${text}"`);
    const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    assertValid(date);
    return date;
  }

  static isValidText(text: string): boolean {
    try {
      BsDateHelper.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * iso  → 2083-07-04 / २०८३-०७-०४
   * long → 4 Kartik 2083 / २०८३ कार्तिक ४
   */
  static format(bs: SimpleDate, { locale = 'en', style = 'iso' }: BsFormatOptions = {}): string {
    assertValid(bs);
    if (style === 'iso') {
      const iso = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
      return locale === 'ne' ? NumeralHelper.toNepali(iso) : iso;
    }
    if (style === 'long') {
      return locale === 'ne'
        ? `${NumeralHelper.toNepali(bs.year)} ${MONTHS_NE[bs.month - 1]} ${NumeralHelper.toNepali(bs.day)}`
        : `${bs.day} ${MONTHS_EN[bs.month - 1]} ${bs.year}`;
    }
    throw new RangeError(`Unknown style "${String(style)}"`);
  }

  /** Nepal's fiscal year runs from 1 Shrawan to the end of Asar, e.g. "2083/84". */
  static fiscalYear(bs: SimpleDate): FiscalYear {
    assertValid(bs);
    const startYear = bs.month >= 4 ? bs.year : bs.year - 1;
    const endYear = startYear + 1;
    return { startYear, endYear, label: `${startYear}/${String(endYear % 100).padStart(2, '0')}` };
  }
}
