# Ward Sewa — Monorepo Guidelines

Ward-office recommendation-letter (sifaris) service. pnpm workspaces, TypeScript (ESM), Node 24.

## Layout

```
apps/                    # deployables
  api/                   # @ward-sewa/api: Express 5 REST API
  web/                   # planned: React + Vite (Turborepo is added with it)
packages/                # shared libraries
  config/                # @ward-sewa/config: eslint / prettier / tsconfig presets
  nepal-utils/           # @ward-sewa/nepal-utils: BS dates, Nepali numerals, divisions
.github/                 # CI workflow, PR template
docker-compose.yml       # postgres, mongo, redis, api
```

## Working in this repo

- Each workspace has its own `CLAUDE.md` (`apps/api/CLAUDE.md`, `packages/nepal-utils/CLAUDE.md`).
  Read it before working inside that workspace. Its rules are blocking and override general
  assumptions.
- Run workspace commands with `pnpm --filter <name> <script>`.

```sh
pnpm test && pnpm typecheck && pnpm lint && pnpm format:check   # what CI runs
pnpm --filter @ward-sewa/nepal-utils coverage
docker compose up -d --build --wait   # postgres:5432, mongo:27017, redis:6380 (not 6379), api:3000
curl localhost:3000/health/ready
```

Redis is on host port **6380** because a local Redis already uses 6379.

## Repo-wide conventions

- **No app-specific code at the root.** The root holds workspace config, CI and Docker Compose only.
- **Per-workspace `package.json` for dependencies.** Only tooling shared by every workspace belongs
  in the root `package.json`.
- **One lockfile, at the root.**
- **Small conventional commits** (`feat(api): ...`, `fix(nepal-utils): ...`, `build: ...`). Every
  commit leaves test, typecheck, lint and format green.

### TypeScript runs without a build step

Node 24 strips types at runtime and `tsc` only type-checks (`noEmit`). Consequences:

- Relative imports include the `.ts` extension: `import { AppError } from '../lib/app-error.ts'`.
- Type-only imports use `import type`.
- Only erasable syntax: no `enum`, `namespace`, or constructor parameter properties. Use string
  literal unions and explicit fields instead.
- `strict` and `noUncheckedIndexedAccess` are on. Narrow `T | undefined` properly; don't add
  `?? fallback` for cases that can't happen, because that hides bugs and leaves uncovered branches.

### Use catalogs for package versions

Every version lives in `pnpm-workspace.yaml` under `catalogs:`. A `package.json` references them as
`"<dep>": "catalog:<name>"`, in `dependencies`, `devDependencies` and `peerDependencies` alike.

- `catalog:generic`: used by both BE and FE (eslint, prettier, typescript, zod, vitest, …)
- `catalog:be`: backend only (express, pg, ioredis, mongodb, pino, …)
- `catalog:fe`: frontend only, added with `apps/web`

Never write a literal version in a `package.json`. Add or bump it in the catalog.

### Packages use `peerDependencies`

Workspace packages under `packages/*` declare runtime and tooling deps as `peerDependencies`; the
consuming app installs the concrete version. Apps under `apps/*` own their full dependency tree and
use `dependencies` / `devDependencies` normally.

### Helpers are classes with static methods

Any utility, helper or non-React library file exposes its functions as static methods on a single
class, never as standalone exported functions. File `<name>.helper.ts`, class `<Name>Helper`
(`promise.helper.ts` → `PromiseHelper`). A one-liner that is truly local and never reused is inlined
instead of getting a helper file.

Framework glue is not a helper: Express middleware, route factories and React components stay
functions.

### React: props are always a named interface

Applies to every React workspace. A component's props are declared as `interface <Component>Props`
above the component, never as an inline object type on the destructured parameter. This holds for
one-prop components too; only a component with no props needs no type.

```tsx
interface WardSelectProps {
  wards: Ward[];
  value: number | null;
  onChange: (wardId: number | null) => void;
}

export function WardSelect({ wards, value, onChange }: WardSelectProps) { ... }
```

### Comments: only where the code can't speak for itself

The default is no comment. A comment must explain something the reader cannot get from the code: an
edge case, a non-obvious constraint, a cross-boundary contract, or why this and not the obvious
thing.

- Don't describe what a declaration is or does; the name and signature say that. Delete such doc
  blocks rather than rewording them.
- If a comment is only needed because a name is bad, fix the name.
- One terse line beats a block. Never leave a truncated comment behind.
- No commented-out code, no `console.log` in a diff (lint enforces `no-console`; scripts are exempt).
- Never add comments indicating AI authorship or generation.

This is a review gate in `.github/pull_request_template.md`.

### Money is a string, always

Fees and any future monetary column are Postgres `numeric(12, 2)` and travel as strings end to end:
node-postgres returns `numeric` as a string, DTOs use `z.string()` (never `z.number()` or
`z.coerce.number()`), arithmetic happens in SQL (`fee + ${amount}::numeric`), and the frontend
parses only at the rendering edge. JS `Number` is a binary float, so `0.1 + 0.2 !== 0.3`.

### Dates

Dates are plain `{ year, month, day }` objects with month 1–12, and AD arithmetic is done in UTC.
"Today" in Nepal is `BsDateHelper.today()` (UTC+05:45), never the server's local date.

### Data stores

PostgreSQL is the source of truth (anything needing transactions or constraints, including letter
numbers). Redis is for short-lived data, rate limits, caching and BullMQ queues. MongoDB is only for
append-only audit and notification logs.

### Reference data is imported, not typed

Never hand-type reference data (BS calendar, municipalities, wards). Import it from a verifiable
source with a script and record the source in the data file.

### Tests

Every feature ships with tests. Integration tests hit real databases, not mocks.
