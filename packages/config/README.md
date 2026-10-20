# @ward-sewa/config

Shared tooling presets. Every workspace extends these instead of keeping its own copy.

| Export                       | Used by                            |
| ---------------------------- | ---------------------------------- |
| `@ward-sewa/config/eslint`   | root `eslint.config.js`            |
| `@ward-sewa/config/prettier` | root `package.json` → `"prettier"` |
| `@ward-sewa/config/tsconfig` | each workspace's `tsconfig.json`   |

The TypeScript preset targets Node's built-in type stripping: `noEmit`, `erasableSyntaxOnly` and
`allowImportingTsExtensions`. Source runs as `.ts` with no build step, and `tsc` only type-checks.
That rules out syntax Node can't strip, such as `enum`, `namespace` and constructor parameter
properties.
