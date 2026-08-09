# Runtime React matrix

Runs the **same unit-test suite** as the native React 16 run
(`yarn test:runtime`) against real React **18** and **19** — the v1
targets. Nothing in `src/` is duplicated: only the React runtime under the
tests changes.

## Mechanics

- `react-18/`, `react-19/` — one fixture per React major, a mini
  `package.json` pinning `react`, `react-dom`, `@testing-library/react` 16
  and its explicit `@testing-library/dom` peer to **exact versions** (no
  carets): the fixtures have no committed lockfile, so exact versions are
  what keeps the matrix — and its documented failure baseline —
  reproducible across runs. Bump them deliberately, in their own commit.
  `setup.sh <18|19>` installs the fixture in place; its `node_modules`
  never touches the root tree (React 16 + RTL 12).
- `vitest.config.js` — extends the root `vitest.config.js` and aliases the
  four React-coupled bare imports (`react`, `react-dom`,
  `@testing-library/react`, `@testing-library/dom`) to the fixture selected
  by `$REACT_VERSION`. The aliased packages are externalized, so their own
  imports resolve with plain Node resolution from inside the fixture — one
  React instance per run, no changes to the root `package.json` under
  yarn 1.
- `act-env.js` — extra setup file: `globalThis.IS_REACT_ACT_ENVIRONMENT`,
  required by React >= 18.

Snapshots are **shared** with the React 16 run (`src/**/__snapshots__`):
the rendered output is identical across 16/18/19 today, so no per-version
isolation is needed. If a React major ever changes the markup, switch this
config to a per-version `resolveSnapshotPath` instead of touching the
committed snapshots.

## Running locally

```bash
# Full matrix (18 then 19), from anywhere:
bash test-runtime/check-matrix.sh

# One version:
bash test-runtime/setup.sh 18
REACT_VERSION=18 yarn vitest run --config test-runtime/vitest.config.js
```

## CI

Each version is a separate **blocking** job in `.github/workflows/ci.yml`
— `runtime (react 18)`, `runtime (react 19)` — gating merges exactly like
the React 16 run in `build`. The suite is act-safe (#83 wrapped the
un-acted instance calls that React 18+ automatic batching broke), so a
failure here is a real React 18/19 regression, not a known gap. Each job
writes its expected/actual result to the job summary.
