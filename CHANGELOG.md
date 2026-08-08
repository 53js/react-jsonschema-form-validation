# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Only user-visible changes are listed. Internal refactors, tooling churn
and dependency-only bumps are omitted.

## [Unreleased]

### Changed

- The npm package is now built with Vite (Rollup) instead of Babel CLI.
  The published surface is unchanged — ES modules mirroring the source
  layout under `dist/`, one file per module (tree-shaking preserved),
  plus the two CSS files and `dist/index.d.ts` at their usual paths —
  and the package is explicitly ESM-only, as it has always been de
  facto. Notes for consumers:
  - `@babel/runtime` is no longer a dependency: Babel helper imports
    are gone from the published files (smaller install, ~56% smaller
    JS in `dist/`).
  - `main` still points to `dist/index.js`, an ES module — exactly as
    before this change (non-regression): it is kept so that resolvers
    that read neither `exports` nor `module` (Jest <= 27, older Metro)
    can still resolve the package. The `exports` map remains the
    source of truth. On Node >= 22.7 the package can be `import`ed
    directly (module syntax detection), and `require()` works on
    Node >= 22.12 / 20.19 (`require(esm)`).
  - `propTypes` are no longer stripped from the published files:
    consumers get prop validation warnings in development builds. In
    production React turns them into no-ops, but they remain in the
    consumer's bundle unless a strip plugin (e.g.
    babel-plugin-transform-react-remove-prop-types) is used.
  - The internal barrel files (`dist/Field/index.js`,
    `dist/FieldError/index.js`, `dist/Form/index.js`) are no longer
    emitted; they were never reachable through the `exports` map.

### Added

- `resetOnSubmit` prop on `<Form>` — set it to `false` to keep the
  touched/submitted state after a successful submit (useful when the
  server-side submit can still fail), then call the context's `reset()`
  once it succeeds. Defaults to `true` (previous behavior, backward
  compatible).
- `reset()` exposed through the form context (`useFormContext().reset`) —
  lets descendants (e.g. a reset button) reset the form state without
  holding a ref to the `<Form>` instance.

### Fixed

- The `<Form>` snapshot test no longer serializes the internal AJV
  instance, whose cache state differed between Jest run modes (flaky in
  single-suite runs). Contributor-facing only; no runtime change.

## [0.6.0] — 2026-07-27

First release since 0.5.6 (2020). Bundles a feature that had been sitting
on `master` since 2020 with a full typing pass, a modern CSS build, and
packaging fixes.

### Added

- Full JSDoc typing for the public API — `<Form>`, `<Field>`,
  `<FieldError>` and their props, `Form<T>` generic (typed form data),
  polymorphic `Field<C>` / `FieldError<C>` (component-driven props),
  hooks, error messages. TypeScript declarations ship as a bundled
  `dist/index.d.ts`; no `@types/…` package required by consumers.
  Components are typed to return `JSX.Element | null` (works across
  `@types/react` 16 → 19).
- `SafePropsOmit` utility type — keeps typed keys strict when the
  underlying `component` has an index signature (`reactstrap`-style).
- `<FieldError>` component override — pass a custom `component` prop
  (previously landed on `master` in 2020 but never released).

### Changed

- CSS build migrated from `node-sass` to `sass` (Dart Sass). Pure JS,
  no native compile step — `yarn install` no longer needs
  `--ignore-scripts` on modern Node. CSS output is byte-equivalent
  (whitespace-only cosmetic differences).
- `@types/json-schema` moved from `devDependencies` to `dependencies`.
  The shipped `.d.ts` imports from it; consumers without it in their
  transitive tree previously got `Cannot find module 'json-schema'`.
- `useFormContext` / `withFormContext` now throw a descriptive error
  when used outside a `<Form>` ancestor (previously returned
  `undefined`, crashing later with a cryptic `TypeError`).

### Removed

- `engines` field from `package.json`. It was a build-machine constraint
  that yarn/npm enforced as an install error on consumers running an
  older Node.
- Test files (`**/*.test.js`) from the published tarball. Previously
  every `*.test.js` under `src/lib/` was compiled to `dist/` and
  shipped to npm.

### Fixed

- `process.env.REACT_APP_JFV_DEBUG` access is now guarded. The
  unguarded lookup crashed browser bundlers that don't polyfill
  `process` (Vite, esbuild, native ESM).

## [0.5.6] — 2020-02-06

### Changed
- Dependency updates.

## [0.5.5] — 2019-12-11

### Changed
- Dependency updates.

## [0.5.4] — 2019-11-20

### Changed
- Dependency updates.

## [0.5.3] — 2019-11-04

### Changed
- Dependency updates.

## [0.5.2] — 2019-10-02

### Added
- README example showing usage with React hooks.

## [0.5.0] — 2019-09-30

### Added
- `useFormContext` hook — read the form's context from within any field.

### Changed
- **BREAKING** — the exported `Context` is renamed to `FormContext`.
  Consumers importing `Context` must update their imports.

## [0.4.1] — 2019-09-24

### Changed
- Dependency updates.

## [0.4.0] — 2019-07-25

No user-facing changes (internal refactor).

## [0.3.3] — 2019-07-23

### Fixed
- Documentation: broken examples and missing `Form` props.

## [0.3.2] — 2019-07-22

### Added
- Documentation for `handleChange` and `<Field name>` usage.

## [0.3.1] — 2019-07-17

No user-facing changes (CI setup, build scripts).

## [0.3.0] — 2019-07-17

Initial public release.

### Added
- `<Form>`, `<Field>`, `<FieldError>` components.
- `onChange` handler on `<Form>` receives an immutably-updated `data`
  copy on every field change.
- `react-select` wrapper.

[Unreleased]: https://github.com/53js/react-jsonschema-form-validation/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/53js/react-jsonschema-form-validation/compare/71300db...v0.6.0
[0.5.6]: https://github.com/53js/react-jsonschema-form-validation/compare/8534580...71300db
[0.5.5]: https://github.com/53js/react-jsonschema-form-validation/compare/53a58a8...8534580
[0.5.4]: https://github.com/53js/react-jsonschema-form-validation/compare/b06b086...53a58a8
[0.5.3]: https://github.com/53js/react-jsonschema-form-validation/compare/d6f6531...b06b086
[0.5.2]: https://github.com/53js/react-jsonschema-form-validation/compare/6e9ce62...d6f6531
[0.5.0]: https://github.com/53js/react-jsonschema-form-validation/compare/7f13f0f...6e9ce62
[0.4.1]: https://github.com/53js/react-jsonschema-form-validation/compare/0ff443b...7f13f0f
[0.4.0]: https://github.com/53js/react-jsonschema-form-validation/compare/31223fe...0ff443b
[0.3.3]: https://github.com/53js/react-jsonschema-form-validation/compare/33a6ef0...31223fe
[0.3.2]: https://github.com/53js/react-jsonschema-form-validation/compare/0430b6c...33a6ef0
[0.3.1]: https://github.com/53js/react-jsonschema-form-validation/compare/733df8f...0430b6c
[0.3.0]: https://github.com/53js/react-jsonschema-form-validation/commit/733df8f
