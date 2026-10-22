# Ward Sewa (वडा सेवा)

A service for citizens to apply for ward-office recommendation letters (sifaris), such as residence
or relationship certificates, and for ward staff to review, approve and issue them.

> Work in progress. See the [roadmap](#roadmap).

## Architecture

```
apps/api              Node.js + Express 5 REST API (TypeScript)
packages/nepal-utils  BS dates, Nepali numerals, all 753 local levels and wards (100% coverage)
packages/config       shared eslint / prettier / tsconfig presets

PostgreSQL  source of truth: users, applications, workflow, issued letters
Redis       OTP codes, rate limiting, caching, BullMQ job queues
MongoDB     append-only audit and notification logs
```

Each store is used for the job it fits. Anything that needs transactions and constraints, such as
application status and letter numbers, lives in PostgreSQL.

## Running locally

Requires Node 24, pnpm and Docker.

```sh
pnpm install
docker compose up -d --build --wait      # postgres, mongo, redis and the api
curl localhost:3000/health/ready
```

To run the API on your machine with hot reload instead (databases still in Docker):

```sh
cp .env.example .env
docker compose up -d --wait postgres mongo redis
pnpm --filter @ward-sewa/api dev
```

## Health checks

| Endpoint            | Purpose                                                                    |
| ------------------- | -------------------------------------------------------------------------- |
| `GET /health/live`  | The process is running. Never checks dependencies.                         |
| `GET /health/ready` | Pings PostgreSQL, MongoDB and Redis (2s timeout each). `503` if any fails. |

The two are separate so that a database outage takes the API out of the load balancer without
causing an orchestrator to restart every API container.

## Development

```sh
pnpm test                  # unit tests, all workspaces
pnpm test:integration      # API against real PostgreSQL and Redis (start them with docker compose first)
pnpm typecheck
pnpm lint
pnpm format
```

TypeScript runs without a build step: Node 24 strips the types at runtime, and `tsc` only
type-checks. Dependency versions are kept in one place, the catalogs in `pnpm-workspace.yaml`.

CI runs lint, format check, typecheck, tests with coverage thresholds, and a full `docker compose`
boot with a readiness check on every push and pull request.

## Roadmap

- [x] `nepal-utils`: BS ↔ AD, Nepal-time "today", fiscal year, provinces/districts
- [x] API skeleton: config validation, structured logging, consistent errors, health checks
- [x] Docker Compose and CI
- [x] TypeScript, shared tooling config, pnpm catalogs
- [x] Location lookup tables: 753 local levels and 6,743 wards from official sources
- [x] Users with scoped roles (citizen, ward secretary, ward chair, municipality admin)
- [x] OTP login with Redis: expiring hashed codes, rate limiting, revocable sessions
- [x] Staff management by the municipality admin, scoped to their own municipality
- [x] Service types per municipality; citizens create and edit draft applications with optimistic locking
- [x] Document uploads (type checked by content, 5 MB limit) and submission with status history
- [x] Staff review workflow: ward-scoped queue, role-checked transitions, notes, status history
- [x] Issuing letters: gap-free numbers per ward and fiscal year, frozen snapshot, public verification
- [x] Letter PDF in Nepali with a QR verification code, rendered by a BullMQ worker
- [x] Redis caching (cache-aside, falls back to the database if Redis is down)
- [x] Redis rate limiting: per IP and per user, RateLimit headers, safe behind proxies
- [x] Idempotency keys: a retried POST /applications creates exactly one application
- [ ] BullMQ SMS job (replacing the development log gateway)
- [ ] MongoDB: audit trail and notification log
- [ ] React citizen portal and staff dashboard
- [ ] OpenAPI documentation
