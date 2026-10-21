# @ward-sewa/api — Guidelines

Express 5 REST API. Read the root `CLAUDE.md` first; these rules add to it.

## Layout

```
src/
  app.ts                 createApp(deps): builds the app, opens no connections
  server.ts              creates real clients, passes them to createApp, handles shutdown
  lib/                   app-error.ts, *.helper.ts (static-method classes)
  middleware/            Express middleware (functions)
  modules/<feature>/     one folder per feature
test/                    mirrors src/; test/integration/ hits real databases
```

## Feature modules

Each feature under `modules/<feature>/` splits by responsibility, and each layer only calls the one
below it:

| File                      | Responsibility                                                  |
| ------------------------- | --------------------------------------------------------------- |
| `<feature>.routes.ts`     | URL → controller, plus middleware such as auth and role checks  |
| `<feature>.controller.ts` | HTTP in/out: parse with the zod schema, call the service, send  |
| `<feature>.service.ts`    | Business rules: workflow transitions, permissions, transactions |
| `<feature>.repository.ts` | SQL only. No business rules                                     |
| `<feature>.schema.ts`     | zod request/response schemas and their inferred types           |

Services and repositories are classes that receive their dependencies through the constructor, so
tests can pass fakes or a transaction-scoped client. A module only creates what it needs.

## Dependencies are injected

`app.ts` must not open connections or read `process.env`. `server.ts` loads the environment with
`EnvHelper.load()`, creates the clients and passes them in. Tests call `createApp` with fakes or with
clients pointed at the Docker databases.

## Errors

- Throw `AppError(status, code, message, { details?, headers? })` for anything the client should
  see. Add new codes to the `ErrorCode` union in `lib/app-error.ts`.
- Every error leaves as `{ error: { code, message, details? } }` through `middleware/error-handler.ts`.
- Anything that isn't an `AppError` (or a recognised zod / body-parser error) is logged in full and
  returned as a generic `500 INTERNAL_ERROR`. Never put internal messages, SQL or stack traces in an
  `AppError`.
- PostgreSQL errors are mapped centrally: unique violation (23505) → 409 `CONFLICT`, foreign-key
  violation (23503) → 400 `VALIDATION_FAILED`, never exposing the constraint name.
- Status codes: 400 validation, 401 unauthenticated, 403 wrong role or ward, 404 not found or not
  yours, 409 invalid transition or version conflict, 413 body too large, 429 rate limited.

## Auth

- OTP login: `POST /auth/otp/request` → `POST /auth/otp/verify` returns an opaque session token;
  send it as `Authorization: Bearer <token>`. `GET /auth/me`, `POST /auth/logout`.
- Redis keys: `otp:code:<phone>` (HMAC of the code + attempts, 5 min TTL), `otp:requests:<phone>`
  (3 per 15 min), `session:<sha256(token)>` (user id, 7 days). Never store a raw code or token.
- `requireAuth(auth)` loads the user from PostgreSQL on every request, so deactivation and role
  changes apply immediately. `requireRole(...roles)` after it for role checks; scope checks (own
  ward, own municipality) belong in the service.
- `SMS_GATEWAY=log` writes codes to the log. Development only; the BullMQ gateway replaces it.
- In controllers, get the user with `RequestHelper.user(req)`.

## Staff management

`GET/POST /admin/staff`, `PATCH /admin/staff/:id`, municipality admins only. Every query joins
through `wards` filtered by the admin's `local_level_code`; another municipality's staff, and
admins themselves, return 404. One active chair per ward is checked in the service (friendly 409)
and enforced by a partial unique index.

## Validation

Validate every request body, query and param with zod in the controller before it reaches the
service. Services can assume their input is well-formed.

## Database

```sh
pnpm db:generate   # after editing src/db/schema: writes a new SQL migration; review and commit it
pnpm db:migrate    # applies migrations and seeds divisions (idempotent); Docker's migrate service runs it
pnpm admin:create --phone 98XXXXXXXX --local-level NP0327101 --name "..."   # first municipality admin
```

- Drizzle with `casing: 'snake_case'`: camelCase in TypeScript, snake_case in SQL. Name
  constraints explicitly.
- Never edit a committed migration. A schema change is a new migration.
- Location lookup tables (`provinces`, `districts`, `local_levels`, `wards`) are seeded from
  `@ward-sewa/nepal-utils`. P-codes are their keys; `wards.id` is what other tables reference.

- PostgreSQL is the source of truth. Anything needing a transaction or constraint lives there,
  including letter numbers (a sequence or row lock, never Redis).
- Money columns are `numeric` and stay strings; see the root `CLAUDE.md`.
- Concurrent edits are caught with the `version` column (optimistic locking) and return 409.

## Tests

- Unit tests mirror `src/` (`test/lib/promise.helper.test.ts` for `src/lib/promise.helper.ts`).
- Route tests use `createApp` with supertest.
- `test/integration/` runs against real databases (`pnpm test:integration`). Its global setup drops and
  recreates `ward_sewa_test` and applies migrations, so tests never depend on leftover data. No
  mocks for PostgreSQL, Redis or MongoDB.
