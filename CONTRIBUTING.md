# Contributing

Thanks for helping improve react-jsonschema-form-validation. This document
describes the actual workflow used in this repository — nothing more.

## Prerequisites

- Node 20 (see `.nvmrc` — `nvm use` picks it up)
- Yarn 1 (the repo uses `yarn.lock`)

## Setup

```bash
yarn install
```

To play with the demo app while developing (Vite):

```bash
yarn start
```

### Dependency upgrades

`package.json` carries a yarn resolution `"**/vite"`: it forces every `vite`
in the tree (vitest would otherwise resolve its own nested vite of a different
major). On the next vite major upgrade, bump or remove this resolution in the
same PR. When bumping dependencies, scan the `yarn install` output for
"incompatible resolution" warnings — yarn 1 only warns, it does not fail.

## Tests

Run these before opening a PR — CI runs the runtime suite, a type-check
matrix equivalent to `yarn test:types`, and the `yarn dist` build.

```bash
# Vitest unit tests (React Testing Library, jsdom)
yarn test:runtime

# Watch mode
yarn test:runtime:watch

# TypeScript check of the repo sources
yarn type-check

# Type-level tests against @types/react 16, 17, 18 and 19
yarn test:types

# Everything (runtime + types)
yarn test
```

`yarn test:types` runs `test-types/check-matrix.sh`: it rebuilds `dist/`,
packs the library into a tarball, installs it inside `test-types/`, then
type-checks `positive.tsx` / `negative.tsx` against each supported
`@types/react` major. It restores `@types/react@16` on exit, even on failure.
See `test-types/README.md` for details.

### Runtime React matrix (18/19)

The same unit-test suite also runs against real React 18 and 19 (the v1
targets) through per-version fixtures — blocking in CI, like the React 16
run:

```bash
# Full matrix: react 18 then 19
bash test-runtime/check-matrix.sh

# A single version
bash test-runtime/setup.sh 19
REACT_VERSION=19 yarn vitest run --config test-runtime/vitest.config.js
```

See `test-runtime/README.md` for the mechanics.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/), matching the
existing history:

```
fix(Form): guard and focus scrollToFirstError
feat(FieldError): announce errors to screen readers via role="alert"
docs: reference CHANGELOG in README
test(helpers): lock the SyntaxError fix for unclosed brackets
build(deps): bump actions/checkout from 4.4.0 to 7.0.1
ci: pin actions to SHA
```

## Pull Requests

- Target the `master` branch.
- CI (GitHub Actions, `.github/workflows/ci.yml`) must pass: the `build` job
  runs `yarn lint`, `yarn type-check`, `yarn test:runtime` and `yarn dist`;
  the `types` matrix type-checks the built bundle against `@types/react`
  16/17/18/19. The `runtime (react 18/19)` matrix re-runs the unit tests
  on real React 18 and 19, and blocks like the rest.
- Keep PRs focused; add or update tests for behavior changes.
- Update `CHANGELOG.md` when the change is user-facing.

## Release

Publishing to npm is tag-driven (`.github/workflows/release.yml`): pushing a
`v*` tag is the deliberate release act. Nominal case, releasing `master`'s
HEAD:

```bash
git checkout master && git pull
yarn version --new-version X.Y.Z   # bump commit + vX.Y.Z tag in one step
git push origin master --follow-tags
```

The workflow re-runs the full verification on the tagged commit (lint,
type-check, unit tests, the `@types/react` 16-19 matrix, the React 18/19
runtime matrix, `yarn dist`), fails if the tag does not match
`package.json`'s version, then publishes with npm provenance —
`prepublishOnly` re-runs the tests, the types matrix and the build as part
of `npm publish` itself.

To release a commit that is not `master`'s HEAD, create a short-lived branch
at that commit, run `yarn version` there and push only the tag — the workflow
triggers on the tag, whatever branch it was created on.

The demo site (GitHub Pages) deploys automatically from `master` via
`.github/workflows/pages.yml`; the `docs/` folder is no longer committed.

### One-time setup (maintainer)

These are repository/npm settings, not code — configure them once:

- **GitHub Pages source**: Settings > Pages > Source must be
  "GitHub Actions" (not "Deploy from a branch"), or the `pages.yml`
  deploy job fails.
- **npm auth**: either declare this repo as a Trusted Publisher on
  npmjs.com (recommended, no secret), or store an npm automation token
  as the `NPM_TOKEN` repository secret — the two options are documented
  in `.github/workflows/release.yml`, above the publish step.
- **Tag protection (recommended)**: add a ruleset (Settings > Rules >
  Rulesets, target: tags matching `v*`) restricting who can create
  release tags. Without it, anyone with write access can push a tag and
  trigger a publish.
