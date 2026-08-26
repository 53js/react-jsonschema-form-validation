# Runtime React matrix

Runs the **same unit-test suite** as the native React 18 run
(`yarn test:runtime`, the root tree's own React) against real React **19**.
Nothing in `src/` is duplicated: only the React runtime under the tests
changes.

## Mechanics

- `react-19/` — one fixture per React major beyond the root's, a mini
  `package.json` pinning `react`, `react-dom`, `@testing-library/react` 16
  and its explicit `@testing-library/dom` peer to **exact versions** (no
  carets): the fixtures have no committed lockfile, so exact versions are
  what keeps the matrix reproducible across runs. Bump them deliberately,
  in their own commit. `setup.sh <19>` installs the fixture in place; its
  `node_modules` never touches the root tree.
- `vitest.config.js` — extends the root `vitest.config.js` and aliases the
  four React-coupled bare imports (`react`, `react-dom`,
  `@testing-library/react`, `@testing-library/dom`) to the fixture selected
  by `$REACT_VERSION`. The aliased packages are externalized, so their own
  imports resolve with plain Node resolution from inside the fixture — one
  React instance per run, no changes to the root `package.json` under
  yarn 1.

The `IS_REACT_ACT_ENVIRONMENT` flag React >= 18 expects is set once for
every run in `src/setupTests.js` (root and fixture alike).

Snapshots are **shared** with the React 18 run (`src/**/__snapshots__`):
the rendered output is identical across 18/19 today, so no per-version
isolation is needed. If a React major ever changes the markup, switch this
config to a per-version `resolveSnapshotPath` instead of touching the
committed snapshots.

## Running locally

```bash
# Full matrix, from anywhere:
bash test-runtime/check-matrix.sh

# One version:
bash test-runtime/setup.sh 19
REACT_VERSION=19 yarn vitest run --config test-runtime/vitest.config.js
```

## CI

The version is a separate **blocking** job in `.github/workflows/ci.yml` —
`runtime (react 19)` — gating merges exactly like the React 18 run in
`build`. The suite is act-safe (#83), so a failure here is a real React 19
regression, not a known gap. The job writes its expected/actual result to
the job summary.
