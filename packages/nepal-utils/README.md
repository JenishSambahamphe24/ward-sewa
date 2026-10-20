# @ward-sewa/nepal-utils

Dependency-free helpers for Nepali government software, shared by the API and (later) the web app:

- **Bikram Sambat (BS) ↔ AD conversion** for BS 2000–2090
- **Nepal-time "today"**, so a server in UTC never issues a letter with the wrong date
- **Formatting and parsing**, with Devanagari digits and month names
- **Fiscal year** labels (1 Shrawan – end of Asar), e.g. `2083/84`
- **Provinces and districts**

```ts
import { BsDateHelper, DivisionHelper, NumeralHelper } from '@ward-sewa/nepal-utils';

BsDateHelper.fromAd({ year: 2026, month: 4, day: 14 }); // { year: 2083, month: 1, day: 1 }
BsDateHelper.today(); // BS date in Nepal right now, whatever the server's timezone
BsDateHelper.format({ year: 2083, month: 7, day: 4 }, { locale: 'ne', style: 'long' }); // '२०८३ कार्तिक ४'
BsDateHelper.fiscalYear({ year: 2083, month: 4, day: 1 }).label; // '2083/84'
NumeralHelper.toNepali(2083); // '२०८३'
DivisionHelper.findDistrict('kathmandu'); // { name: 'Kathmandu', provinceId: 3 }
```

## Design notes

- **Dates are plain `{ year, month, day }` objects, month 1–12.** JS `Date` is an instant, not a
  calendar date, and mixing the two causes off-by-one bugs around midnight.
- **Moments vs dates.** Use `today()` or `fromInstant(date)` for a moment in time; they apply Nepal
  time. `fromAd({ year, month, day })` converts a calendar date exactly as given.
- **All AD arithmetic is in UTC.** The host timezone can't shift a result.
- **Nepal Standard Time is UTC+05:45.** Between 18:15 and 24:00 UTC, a server in UTC is still on the
  previous day while Nepal is on the next. This is tested.
- **Invalid input throws instead of rolling over.** `new Date(2026, 1, 30)` silently becomes 2
  March; `BsDateHelper.toAd` rejects 30 Mangsir when that month has 29 days.
- **Shared data is frozen**, so one caller can't corrupt another's province list.
- **TypeScript without a build step.** `exports` points at `src/index.ts`; Node 24 strips the types
  at runtime and Vite compiles them for the browser.

## Testing

```sh
pnpm test        # 38 tests
pnpm coverage    # 100% lines/branches/functions
pnpm typecheck
```

Every day in the supported range (33,000+ days) is converted both ways and compared against
[nepali-date-converter](https://github.com/subeshb1/Nepali-Date). Both read the same month table,
so this verifies the conversion code, not the table.

## Data sources

- **BS month lengths**: extracted from `nepali-date-converter@3.4.0` (MIT, © Subesh Bhandari) by
  [`scripts/build-calendar.ts`](scripts/build-calendar.ts). The script parses the file as text and
  validates every value before writing it. Regenerate with
  `pnpm build:calendar node_modules/nepali-date-converter/dist/lib/date-config.js`.
  Not yet checked against an official calendar (Nepal Panchanga Nirnayak Samiti).
- **Provinces and districts**: the 7 provinces and 77 districts under the 2015 constitution,
  entered by hand. Not yet checked against an official machine-readable source. Municipalities
  and wards are not included; they will be imported from an official source.
