# Ward Sewa

Ward-office recommendation-letter (sifaris) service. pnpm monorepo, plain JavaScript (ESM), Node 24.

## Layout

- `apps/api`: Express 5 API. `src/app.js` builds the app from injected deps (no connections opened
  there); `src/server.js` wires real clients. Tests inject fakes via `createApp`.
- `packages/nepal-utils`: BS dates, Nepali numerals, provinces/districts. No runtime dependencies.
- `apps/web` (planned): React + Vite.

## Commands

```sh
pnpm test                                   # all workspaces (vitest)
pnpm --filter @ward-sewa/nepal-utils coverage
pnpm lint && pnpm format:check
docker compose up -d --build --wait         # postgres:5432, mongo:27017, redis:6380 (not 6379), api:3000
curl localhost:3000/health/ready
```

Redis is on host port **6380** because a local Redis already uses 6379.

## Conventions

- Dates are plain `{ year, month, day }` objects with month 1–12. AD arithmetic in UTC. "Today" in
  Nepal is `todayBs()` (UTC+05:45), never the server's local date.
- Validate input with zod. Errors leave the API as `{ error: { code, message, details? } }` via
  `AppError` and `errorHandler` in `apps/api/src/lib/errors.js`. Never leak internal error messages.
- Store responsibilities: PostgreSQL is the source of truth (anything needing transactions or
  constraints, including letter numbers). Redis for short-lived data, rate limits, caching, BullMQ
  queues. MongoDB only for append-only audit and notification logs.
- Never hand-type reference data (BS calendar, municipalities, wards). Import it from a verifiable
  source with a script and record the source.
- Every feature ships with tests. Integration tests should hit real databases, not mocks.
- Small, conventional commits (`feat(api): ...`, `fix(nepal-utils): ...`).
