# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Only user-visible changes are listed. Internal refactors, tooling churn
and dependency-only bumps are omitted.

## [Unreleased]

## [0.6.0] — 2026-07-27

First release since 0.5.5 (2019). Bundles a feature that had been sitting
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
[0.6.0]: https://github.com/53js/react-jsonschema-form-validation/compare/8534580...v0.6.0
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
