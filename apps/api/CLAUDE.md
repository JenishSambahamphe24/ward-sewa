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

## Service types and applications

- `service_types` are per municipality (`local_level_code`); fee is `numeric` and leaves the API as a
  string. `GET /service-types?localLevel=` is public. Demo data comes from
  `db/seeds/service-types.seed.ts` (sample, Kathmandu and Lalitpur only).
- Each service type defines its `formFields`; `FormDataHelper.schema(fields, { complete })`
  validates `form_data`. Drafts may be partial; submit uses `complete: true`. Unknown keys are
  rejected, BS dates are normalised to `YYYY-MM-DD`.
- Citizens own applications: every query filters by `citizen_id`; someone else's is 404.
- Edits send `version`; `updateEditable` matches `id + citizen_id + version + editable status` and
  bumps the version. Zero rows → 409. Only `draft` and `needs_info` are editable.
- Integration tests reset with `TestDb.reset(db)` (TRUNCATE … CASCADE), never `DELETE FROM users`.

## Documents and submission

- `POST /applications/:id/documents` (multipart: `documentCode` + `file`), only for codes the service
  type requires, only while editable. Max 5 MB; the type is detected from the bytes
  (`FileTypeHelper`), never the client's name or MIME. Uploading the same code again replaces it.
- Files go through `FileStorage` (`LocalFileStorage` under `UPLOAD_DIR`; swappable for S3) under a
  random key. Write the file first, then the row; delete the file if the row fails.
- Downloads are owner-checked and sent as attachments with `X-Content-Type-Options: nosniff`.
- `POST /applications/:id/submit` needs the citizen's name, every required field
  (`FormDataHelper` with `complete: true`) and every required document; errors list what's missing.
- Every status change goes through `ApplicationsRepository.transition`, which updates the status
  and writes `application_status_history` in one transaction, matching on `version`.

## Review workflow

- `ApplicationAccess.find(user, id)` is the single rule for who may see an application: the
  applicant, or staff of its ward once submitted (staff never see drafts). Everything else is 404.
  Documents and history use it, so ward staff can read them too; only the applicant uploads.
- `GET /staff/applications` is the ward queue (oldest first, filter by status and service type),
  served by the `(ward_id, status, created_at)` index.
- `POST /staff/applications/:id/transition { to, version, note? }` follows the `TRANSITIONS` table
  in `review.service.ts`. Wrong role → 403, step not allowed from the current status → 409, missing
  required note → 400, stale version → 409. Only the chair approves; the municipality admin can't
  review at all (separation of duties).

## Issuing letters

- `POST /staff/applications/:id/issue { version }` (secretary or chair of the ward, application
  `approved`). `LettersRepository.issue` runs status change + history + number + letter in one
  transaction; `ApplicationsRepository.transition(change, tx)` joins it.
- Letter numbers come from the `letter_counters` row for (ward, fiscal year), incremented with an
  upsert. Never use a SEQUENCE for them: sequences skip numbers on rollback, the register must not.
- `issued_letters.snapshot` freezes applicant name, service type, address (with names) and form
  data. Read letters from the snapshot, never by re-joining live tables.
- Issue date and fiscal year come from `BsDateHelper.today()` (Nepal time).
- `GET /verify/:code` is public and returns only what a verifier needs (no phone, no form data).

## Caching

- `RedisCache.getOrLoad(key, ttl, load)` is cache-aside: Redis errors fall back to `load` with a
  warning, so the cache can never take an endpoint down.
- Keys: `cache:<thing>:v<n>:<id>`. Bump `v<n>` when the cached shape changes. Always set a TTL, and
  call the owning service's `invalidate()` after a write.
- `GET /service-types` is cached for 10 minutes per municipality; responses carry `X-Cache: HIT|MISS`.

## Rate limiting

- `rateLimit(redis, logger, rule)` (`middleware/rate-limit.ts`): fixed-window `INCR` + `EXPIRE NX`
  in one MULTI, standard `RateLimit-*` headers, 429 with `Retry-After`. Fails open (and skips
  instantly) when Redis isn't ready.
- Rules live in `DEFAULT_RATE_LIMITS` and are injected into `createApp` (tests pass their own):
  `global` per IP on everything after health checks, `auth` on `/auth/otp`, `verify` on `/verify`,
  `uploads` per user on document uploads (place per-user limits after `requireAuth`).
- `TRUST_PROXY` = number of proxies in front. Keep it 0 without a proxy: trusting
  `X-Forwarded-For` otherwise lets clients fake their IP and bypass every limit.

## Idempotency keys

- `idempotent(redis, logger)` (`middleware/idempotency.ts`) on `POST /applications`, after
  `requireAuth`. Optional `Idempotency-Key` header (8–128 of `A-Za-z0-9_-`), scoped per user.
- Claim with `SET idem:<user>:<key> processing NX EX 60`; a 2xx response is stored for 24 h and
  replayed (`Idempotent-Replayed: true`); errors free the key. Same key + different body → 422
  `IDEMPOTENCY_KEY_REUSED`; still processing → 409 with `Retry-After: 1`.
- The outcome is stored before the response is sent. Redis down → passes through with a warning
  (a duplicate draft is harmless; anything involving money should refuse instead).
- Add it to any new endpoint that creates something a client might retry.

## Audit log (MongoDB, via a transactional outbox)

- Every change worth auditing adds an event with `AuditOutboxRepository.add(tx, event)` **inside the
  transaction that makes the change** (status transitions, letter issue, staff assign/update). For
  multi-repository writes, use `TransactionRunner.run(tx => …)` and pass `tx` down.
- The worker's `AuditRelay` drains `audit_outbox` into MongoDB `audit_events` (`FOR UPDATE SKIP
LOCKED`, outbox id as `_id`, duplicate-key errors ignored), then deletes the rows. MongoDB down
  only delays events; it never blocks or loses them.
- `GET /applications/:id/audit` (applicant or ward staff) reads the `by_application` index.
- `notification_logs` records SMS attempts (masked number, never the message), expires after 90
  days via a TTL index, and is best effort: a MongoDB failure must not stop an SMS.

## Letter PDFs (BullMQ)

- Issuing queues a `render` job on the `letter-pdf` queue (`BullLetterPdfQueue`), after the letter
  commits. `jobId: letter-<id>` makes enqueueing idempotent; 5 attempts with exponential backoff.
- `src/worker.ts` is a separate process (Docker `worker` service, `pnpm dev:worker`). Its Redis
  connection needs `maxRetriesPerRequest: null`. On start it re-queues letters without a PDF, which
  covers a failed enqueue after commit.
- `LetterPdfProcessor` is idempotent: skips if a PDF exists; `attachPdf` only sets
  `pdf_storage_key` where it is NULL, and the loser of a race deletes its file.
- `LetterPdfHelper` lays out mixed Devanagari/Latin text itself (word wrap on a shared baseline,
  Noto Sans Devanagari + Noto Sans, `assets/fonts`, OFL). Check layout changes visually
  (`qlmanage -t` on macOS), not only by tests.
- `GET /applications/:id/letter/pdf` returns 409 with `Retry-After: 5` until the PDF exists.

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
- Never edit or regenerate a migration once it has been applied anywhere, even to your own dev
  database: Drizzle tracks applied migrations by the journal timestamp, so a regenerated file
  looks new and runs again. A schema change is a new migration.
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
