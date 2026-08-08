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
  16/17/18/19.
- Keep PRs focused; add or update tests for behavior changes.
- Update `CHANGELOG.md` when the change is user-facing.
