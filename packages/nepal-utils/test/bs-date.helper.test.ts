import { describe, expect, it } from 'vitest';
import converter from 'nepali-date-converter';
import { BsDateHelper } from '../src/index.ts';
import type { BsFormatOptions, SimpleDate } from '../src/index.ts';

// CommonJS interop: Vitest unwraps the `default` export, Node's own loader does not.
const NepaliDate = (
  'fromAD' in converter ? converter : converter.default
) as typeof converter.default;

const DAY_MS = 86_400_000;
const { MIN_YEAR, MAX_YEAR } = BsDateHelper;

describe('BsDateHelper.toAd / fromAd', () => {
  it('maps the epoch: BS 2000-01-01 is AD 1943-04-14', () => {
    expect(BsDateHelper.toAd({ year: 2000, month: 1, day: 1 })).toEqual({
      year: 1943,
      month: 4,
      day: 14,
    });
    expect(BsDateHelper.fromAd({ year: 1943, month: 4, day: 14 })).toEqual({
      year: 2000,
      month: 1,
      day: 1,
    });
  });

  it('maps New Year 2083 to AD 2026-04-14', () => {
    expect(BsDateHelper.toAd({ year: 2083, month: 1, day: 1 })).toEqual({
      year: 2026,
      month: 4,
      day: 14,
    });
  });

  it('handles the last day of the supported range', () => {
    const lastDay = { year: MAX_YEAR, month: 12, day: BsDateHelper.daysInMonth(MAX_YEAR, 12) };
    expect(BsDateHelper.fromAd(BsDateHelper.toAd(lastDay))).toEqual(lastDay);
  });

  // Checks the conversion code against another implementation. Both read the same month
  // table, so this cannot catch a wrong entry in the table itself.
  it('agrees with nepali-date-converter for every day from BS 2000 to 2090', () => {
    const start = Date.UTC(1943, 3, 14);
    let mismatches = 0;
    let checked = 0;

    for (let t = start; ; t += DAY_MS) {
      const d = new Date(t);
      const ad = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
      let ours: SimpleDate;
      try {
        ours = BsDateHelper.fromAd(ad);
      } catch {
        break;
      }
      const ref = NepaliDate.fromAD(new Date(ad.year, ad.month - 1, ad.day)).getBS();
      if (ours.year !== ref.year || ours.month !== ref.month + 1 || ours.day !== ref.date) {
        mismatches++;
      }
      expect(BsDateHelper.toAd(ours)).toEqual(ad);
      checked++;
    }

    expect(checked).toBeGreaterThan(33_000);
    expect(mismatches).toBe(0);
  });

  it('rejects dates outside the supported range', () => {
    expect(() => BsDateHelper.fromAd({ year: 1943, month: 4, day: 13 })).toThrow(RangeError);
    expect(() => BsDateHelper.toAd({ year: MIN_YEAR - 1, month: 1, day: 1 })).toThrow(RangeError);
    expect(() => BsDateHelper.toAd({ year: MAX_YEAR + 1, month: 1, day: 1 })).toThrow(RangeError);
  });

  it('rejects impossible dates instead of rolling them over', () => {
    expect(() => BsDateHelper.fromAd({ year: 2026, month: 2, day: 30 })).toThrow(
      /not a valid AD date/,
    );
    expect(() => BsDateHelper.toAd({ year: 2083, month: 8, day: 30 })).toThrow(/has 29 days/);
    expect(() => BsDateHelper.toAd({ year: 2083, month: 13, day: 1 })).toThrow(
      /month must be 1-12/,
    );
    expect(() => BsDateHelper.toAd({ year: 2083, month: 1, day: 1.5 })).toThrow(TypeError);
  });
});

describe('BsDateHelper.isValid', () => {
  it.each([
    [{ year: 2083, month: 3, day: 32 }, true],
    [{ year: 2083, month: 1, day: 32 }, false],
    [{ year: 2083, month: 1, day: 0 }, false],
    [{ year: 1999, month: 1, day: 1 }, false],
    [{ year: '2083', month: 1, day: 1 } as unknown as SimpleDate, false],
  ])('%o → %s', (date, expected) => {
    expect(BsDateHelper.isValid(date)).toBe(expected);
  });
});

describe('BsDateHelper.today', () => {
  // 18:15 UTC is midnight in Nepal: the date must change there, not at UTC midnight.
  it('rolls over at midnight Nepal time, not server time', () => {
    const beforeMidnightNpt = new Date('2026-04-13T18:14:59Z');
    const atMidnightNpt = new Date('2026-04-13T18:15:00Z');
    const lastDayOf2082 = { year: 2082, month: 12, day: BsDateHelper.daysInMonth(2082, 12) };
    expect(BsDateHelper.today(beforeMidnightNpt)).toEqual(lastDayOf2082);
    expect(BsDateHelper.today(atMidnightNpt)).toEqual({ year: 2083, month: 1, day: 1 });
  });
});

describe('BsDateHelper.weekday', () => {
  it('returns 2 (Tuesday) for New Year 2083, AD 2026-04-14', () => {
    expect(BsDateHelper.weekday({ year: 2083, month: 1, day: 1 })).toBe(2);
  });
});

describe('BsDateHelper.parse', () => {
  it('accepts ASCII and Devanagari digits', () => {
    expect(BsDateHelper.parse('2083-07-04')).toEqual({ year: 2083, month: 7, day: 4 });
    expect(BsDateHelper.parse('२०८३-७-४')).toEqual({ year: 2083, month: 7, day: 4 });
  });

  it.each(['2083/07/04', '83-07-04', '', '2083-01-32'])('rejects "%s"', (text) => {
    expect(() => BsDateHelper.parse(text)).toThrow(RangeError);
  });
});

describe('BsDateHelper.format', () => {
  const date = { year: 2083, month: 7, day: 4 };

  it.each<[BsFormatOptions, string]>([
    [{}, '2083-07-04'],
    [{ locale: 'ne' }, '२०८३-०७-०४'],
    [{ style: 'long' }, '4 Kartik 2083'],
    [{ locale: 'ne', style: 'long' }, '२०८३ कार्तिक ४'],
  ])('%o → %s', (options, expected) => {
    expect(BsDateHelper.format(date, options)).toBe(expected);
  });

  it('rejects unknown styles', () => {
    const options = { style: 'fancy' } as unknown as BsFormatOptions;
    expect(() => BsDateHelper.format(date, options)).toThrow(RangeError);
  });
});

describe('BsDateHelper.fiscalYear', () => {
  it.each([
    [{ year: 2083, month: 3, day: 32 }, '2082/83'], // last day of Asar
    [{ year: 2083, month: 4, day: 1 }, '2083/84'], // 1 Shrawan starts the new year
  ])('%o → %s', (date, label) => {
    expect(BsDateHelper.fiscalYear(date).label).toBe(label);
  });

  it('rejects dates outside the table', () => {
    expect(() => BsDateHelper.fiscalYear({ year: MAX_YEAR + 1, month: 1, day: 1 })).toThrow(
      RangeError,
    );
  });

  it('pads the end year across a century boundary', () => {
    expect(BsDateHelper.fiscalYear({ year: 2000, month: 4, day: 1 }).label).toBe('2000/01');
  });
});
