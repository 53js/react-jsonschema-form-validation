# Type-level tests

Compiled in CI against the *built* `dist/index.d.ts` to catch typing
regressions invisible from inside the repo — return-type incompatibilities,
missing dependency imports, ambient module leaks, over-loose props, etc.

Deliberately non-executable — the suite only needs to type-check. It's
run against `@types/react` 16, 17, 18 and 19 (see `check-matrix.sh` for
local, `.github/workflows/ci.yml` for CI matrix).

## Files

- `positive.tsx` — real-world usages that MUST compile (basic form, generic
  `Form<T>`, polymorphic `Field`, `forwardRef`, `useFormContext`, error
  messages, legacy `withFormContext`). Also includes `Expect<Equal<...>>`
  type-level assertions on key inference behaviors.
- `negative.tsx` — usages that MUST NOT compile, each guarded by
  `// @ts-expect-error`. If a regression makes an invalid usage legal, the
  directive becomes "unused" and CI fails with a clear error.
- `_helpers.ts` — dependency-free `Expect<T>` / `Equal<X, Y>` type helpers.
- `package.json` — mini-workspace pinning `@types/react`, `react`, and the
  parent lib (installed from a fresh tarball produced by `setup.sh`).
- `setup.sh` — rebuilds `dist/`, packs the parent lib into a tarball, then
  runs `yarn install` inside `test-types/`. Installing from a tarball
  isolates the fixture's `node_modules` from the parent repo's so
  `@types/react` resolves to the version the fixture pins.
- `check-matrix.sh` — runs `setup.sh` once, then loops `yarn test` across
  every supported `@types/react` major. Restores the default (16) on exit
  via `trap`, so a mid-run failure doesn't leave `package.json` dirty.

## Running locally

```bash
# From repo root
yarn test:types    # checks the bundle against @types/react 16 + 17 + 18 + 19
yarn test          # unit tests + type tests
```

## CI

Each `@types/react` version runs as a **separate GitHub Actions job** through
the `types` matrix in `.github/workflows/ci.yml` (`types (@types/react 16)` …
`types (@types/react 19)`) — parallel, no shell mutation, extends in one line
if a new major lands.
