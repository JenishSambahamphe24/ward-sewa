# @ward-sewa/nepal-utils

Dependency-free helpers for Nepali government software:

- **Bikram Sambat (BS) ↔ AD conversion** for BS 2000–2090
- **Nepal-time "today"**, so a server in UTC never issues a letter with the wrong date
- **Formatting and parsing**, with Devanagari digits and month names
- **Fiscal year** labels (1 Shrawan – end of Asar), e.g. `2083/84`
- **Provinces and districts**

```js
import { adToBs, bsToAd, todayBs, formatBs, bsFiscalYear } from '@ward-sewa/nepal-utils';

adToBs({ year: 2026, month: 4, day: 14 }); // { year: 2083, month: 1, day: 1 }
formatBs({ year: 2083, month: 7, day: 4 }, { locale: 'ne', style: 'long' }); // '२०८३ कार्तिक ४'
bsFiscalYear({ year: 2083, month: 4, day: 1 }).label; // '2083/84'
```

## Design notes

- **Dates are plain `{ year, month, day }` objects, month 1–12.** JS `Date` is an instant, not a calendar
  date, and mixing the two causes off-by-one bugs around midnight.
- **All AD arithmetic is in UTC.** The host timezone can't shift a result.
- **`todayBs()` uses Nepal Standard Time (UTC+05:45).** Between 18:15 and 24:00 UTC, a server in UTC is
  already on the next day in Nepal. This is tested.
- **Invalid input throws instead of rolling over.** `new Date(2026, 1, 30)` silently becomes 2 March;
  `bsToAd` rejects 30 Mangsir when that month has 29 days.
- **Shared data is frozen**, so one caller can't corrupt another's province list.

## Testing

```sh
pnpm test        # 38 tests
pnpm coverage    # 100% lines/branches/functions
```

Every day in the supported range (33,000+ days) is converted both ways and compared against
[nepali-date-converter](https://github.com/subeshb1/Nepali-Date), an independent implementation.

## Data sources

- **BS month lengths**: extracted from `nepali-date-converter@3.4.0` (MIT, © Subesh Bhandari) by
  [`scripts/build-calendar.js`](scripts/build-calendar.js). The script parses the file as text and
  validates every value before writing it.
- **Provinces and districts**: the 7 provinces and 77 districts under the 2015 constitution.
  Municipalities and wards are not included yet; they should be imported from an official
  government source.
