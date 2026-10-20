import { describe, expect, it } from 'vitest';
import NepaliDate from 'nepali-date-converter';
import {
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  adToBs,
  bsFiscalYear,
  bsToAd,
  bsWeekday,
  daysInBsMonth,
  formatBs,
  isValidBsDate,
  parseBsDate,
  todayBs,
} from '../src/index.js';

const DAY_MS = 86_400_000;

describe('bsToAd / adToBs', () => {
  it('maps the epoch: BS 2000-01-01 is AD 1943-04-14', () => {
    expect(bsToAd({ year: 2000, month: 1, day: 1 })).toEqual({ year: 1943, month: 4, day: 14 });
    expect(adToBs({ year: 1943, month: 4, day: 14 })).toEqual({ year: 2000, month: 1, day: 1 });
  });

  it('maps New Year 2083 to AD 2026-04-14', () => {
    expect(bsToAd({ year: 2083, month: 1, day: 1 })).toEqual({ year: 2026, month: 4, day: 14 });
  });

  it('handles the last day of the supported range', () => {
    const lastDay = { year: BS_MAX_YEAR, month: 12, day: daysInBsMonth(BS_MAX_YEAR, 12) };
    expect(adToBs(bsToAd(lastDay))).toEqual(lastDay);
  });

  // Every day in the supported range, checked against an independent implementation.
  it('agrees with nepali-date-converter for every day from BS 2000 to 2090', () => {
    const start = Date.UTC(1943, 3, 14);
    let mismatches = 0;
    let checked = 0;

    for (let t = start; ; t += DAY_MS) {
      const d = new Date(t);
      const ad = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
      let ours;
      try {
        ours = adToBs(ad);
      } catch {
        break; // past the end of our table
      }
      const ref = NepaliDate.fromAD(new Date(ad.year, ad.month - 1, ad.day)).getBS();
      if (ours.year !== ref.year || ours.month !== ref.month + 1 || ours.day !== ref.date) {
        mismatches++;
      }
      expect(bsToAd(ours)).toEqual(ad);
      checked++;
    }

    expect(checked).toBeGreaterThan(33_000);
    expect(mismatches).toBe(0);
  });

  it('rejects dates outside the supported range', () => {
    expect(() => adToBs({ year: 1943, month: 4, day: 13 })).toThrow(RangeError);
    expect(() => bsToAd({ year: BS_MIN_YEAR - 1, month: 1, day: 1 })).toThrow(RangeError);
    expect(() => bsToAd({ year: BS_MAX_YEAR + 1, month: 1, day: 1 })).toThrow(RangeError);
  });

  it('rejects impossible dates instead of rolling them over', () => {
    expect(() => adToBs({ year: 2026, month: 2, day: 30 })).toThrow(/not a valid AD date/);
    expect(() => bsToAd({ year: 2083, month: 8, day: 30 })).toThrow(/has 29 days/);
    expect(() => bsToAd({ year: 2083, month: 13, day: 1 })).toThrow(/month must be 1-12/);
    expect(() => bsToAd({ year: 2083, month: 1, day: 1.5 })).toThrow(TypeError);
  });
});

describe('isValidBsDate', () => {
  it.each([
    [{ year: 2083, month: 3, day: 32 }, true],
    [{ year: 2083, month: 1, day: 32 }, false],
    [{ year: 2083, month: 1, day: 0 }, false],
    [{ year: 1999, month: 1, day: 1 }, false],
    [{ year: '2083', month: 1, day: 1 }, false],
  ])('%o → %s', (date, expected) => {
    expect(isValidBsDate(date)).toBe(expected);
  });
});

describe('todayBs', () => {
  // 18:15 UTC is midnight in Nepal: the date must change there, not at UTC midnight.
  it('rolls over at midnight Nepal time, not server time', () => {
    const beforeMidnightNpt = new Date('2026-04-13T18:14:59Z');
    const atMidnightNpt = new Date('2026-04-13T18:15:00Z');
    const lastDayOf2082 = { year: 2082, month: 12, day: daysInBsMonth(2082, 12) };
    expect(todayBs(beforeMidnightNpt)).toEqual(lastDayOf2082);
    expect(todayBs(atMidnightNpt)).toEqual({ year: 2083, month: 1, day: 1 });
  });
});

describe('bsWeekday', () => {
  it('returns 2 (Tuesday) for New Year 2083, AD 2026-04-14', () => {
    expect(bsWeekday({ year: 2083, month: 1, day: 1 })).toBe(2);
  });
});

describe('parseBsDate', () => {
  it('accepts ASCII and Devanagari digits', () => {
    expect(parseBsDate('2083-07-04')).toEqual({ year: 2083, month: 7, day: 4 });
    expect(parseBsDate('२०८३-७-४')).toEqual({ year: 2083, month: 7, day: 4 });
  });

  it.each(['2083/07/04', '83-07-04', '', '2083-01-32'])('rejects "%s"', (text) => {
    expect(() => parseBsDate(text)).toThrow(RangeError);
  });
});

describe('formatBs', () => {
  const date = { year: 2083, month: 7, day: 4 };

  it.each([
    [{}, '2083-07-04'],
    [{ locale: 'ne' }, '२०८३-०७-०४'],
    [{ style: 'long' }, '4 Kartik 2083'],
    [{ locale: 'ne', style: 'long' }, '२०८३ कार्तिक ४'],
  ])('%o → %s', (options, expected) => {
    expect(formatBs(date, options)).toBe(expected);
  });

  it('rejects unknown styles', () => {
    expect(() => formatBs(date, { style: 'fancy' })).toThrow(RangeError);
  });
});

describe('bsFiscalYear', () => {
  it.each([
    [{ year: 2083, month: 3, day: 32 }, '2082/83'], // last day of Asar
    [{ year: 2083, month: 4, day: 1 }, '2083/84'], // 1 Shrawan starts the new year
    [{ year: BS_MAX_YEAR + 1, month: 1, day: 1 }, null], // outside the table
  ])('%o → %s', (date, label) => {
    if (label === null) expect(() => bsFiscalYear(date)).toThrow(RangeError);
    else expect(bsFiscalYear(date).label).toBe(label);
  });

  it('pads the end year across a century boundary', () => {
    expect(bsFiscalYear({ year: 2000, month: 4, day: 1 }).label).toBe('2000/01');
  });
});
