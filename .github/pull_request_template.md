## What

<!-- What changes, and why. Link the issue if there is one. -->

## How it was tested

<!-- Commands run, new tests, manual checks. Say what was not tested. -->

## Checklist

- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm format:check` pass
- [ ] New behaviour has tests; database behaviour has integration tests against real databases
- [ ] Errors go through `AppError`; no internal messages reach the client
- [ ] New dependency versions are in a catalog in `pnpm-workspace.yaml`, not in `package.json`
- [ ] UI uses `cn()` and semantic theme tokens; no DOM lookups, hex colors or palette classes
- [ ] Workspace `CLAUDE.md` / README updated if a convention or command changed

## Comments

- [ ] Comments are one short line; none restates what a declaration is or does; each one explains a why, an edge case or a
      constraint
- [ ] No commented-out code, no `console.log`, no truncated comments
