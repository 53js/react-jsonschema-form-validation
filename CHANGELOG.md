# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Only user-visible changes are listed. Internal refactors, tooling churn
and dependency-only bumps are omitted.

## [Unreleased]

### Breaking

- **React 18 is now the minimum supported version** (`peerDependencies:
  react >=18`), in preparation for the v1 hooks architecture (`useId`,
  `useSyncExternalStore` — no shims). React 16.8/17 stay served by the
  0.x line.
- **AJV upgraded from v6 to v8** (`ajv@^8.17.0`). No code change is needed
  if you only pass `schema`/`data` and read errors through `<FieldError>`
  or `error.field`. Otherwise, see the "Migrating to v1 (AJV 8)" section
  of the README. In short:
  - Raw errors now carry the AJV 8 shape: `instancePath` (JSON Pointer,
    e.g. `/user/email`) replaces `dataPath` (`.user.email`). The
    normalized `field` property (`user.email`) is unchanged.
  - Default error message wording changed in AJV 8 (`should …` →
    `must …`, e.g. `must have required property 'email'`). Code or tests
    matching on default messages must be updated; the `errorMessages`
    prop (keyed by `error.keyword`) is immune.
  - String formats (`email`, `date`, `uri`…) now come from the new
    `ajv-formats` dependency (AJV 8 removed them from core), registered
    on the default instance in its default `full` mode — stricter than
    AJV 6 on some edge values, so a few borderline strings that used to
    pass may now be rejected. Custom instances passed via the `ajv` prop
    must call `addFormats(ajv)` themselves if they rely on formats.
  - The default instance is created with `strict: false`, keeping AJV 6's
    permissive behavior (unknown keywords compile instead of throwing).
    One safety net is lost in the process: AJV 6 threw at compile time on
    an unknown **format name** (a typo like `format: 'emial'` crashed
    immediately), whereas AJV 8 with `strict: false` only logs a warning
    and ignores the format — every value then passes silently. Pass your
    own strict-mode instance via the `ajv` prop to restore
    compile-time typo detection.
  - A custom instance passed through the `ajv` prop should now be AJV 8+.
    AJV 6 instances keep working for the transition thanks to the
    `dataPath` fallback, which is deprecated and will be removed in the
    final 1.0.
  - The `ajv` prop is now duck-typed (any object exposing a
    `compile(schema)` function) instead of `instanceOf(Ajv)`: `Ajv2019` /
    `Ajv2020` instances — e.g. for JSON Schema draft 2020-12 — are
    accepted.
## [0.7.0] — 2026-08-25

### Added

- Validation errors now carry the current value of the offending field:
  the default AJV instance is created with `verbose: true`, so every
  error passed to `errorMessages` callbacks (and exposed through the
  form context) has `data` — the field's current value for value-level
  keywords (`minLength`, `format`, `enum`, `const`, `$data`
  references, …), or the parent object for `required` errors — plus
  `schema` (the failing keyword's value) and `parentSchema` (the
  enclosing subschema). Example:
  ``minLength: (e) => `"${e.data}" is too short (min ${e.params.limit})` ``.
  If you pass a custom instance through the `ajv` prop, enable
  `verbose: true` yourself to get the same behavior. Closes #6.

### Changed

- `dot-prop-immutable` (unmaintained since 2020) is no longer a
  dependency: the single function the library used (`set`) is now a
  small internal module with the same semantics, validated against the
  original with a differential test battery. Behavior of form updates is
  unchanged — dot paths with numeric indexes, creation of missing
  intermediate objects, and structural immutability (untouched siblings
  keep their reference identity) all work exactly as before. The only
  deviation is a hardening one: `__proto__`/`constructor`-style path
  segments can no longer touch any prototype (writes create plain own
  properties instead of invoking inherited setters).
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
- `<Form>` no longer dispatches a validation pass on re-renders where
  none of the validation inputs (`data`, `schema`, `ajv`,
  `throttleDuration`) changed by reference — e.g. the internal state
  updates caused by touching a field, submitting, resetting, or the
  `<FieldError>` id registry. Observable behavior is unchanged: the
  memoized validator already short-circuited the actual AJV work on an
  identical `data` reference (and it is kept as defense in depth); the
  guard removes the redundant per-update dispatch. Validation still
  runs on mount and whenever `data`, `schema`, `ajv` or
  `throttleDuration` changes. Note a pre-existing limitation this
  change neither introduces nor fixes: mutating `data` in place and
  re-rendering with the same reference has never triggered a
  revalidation (the memoized validator already short-circuited on the
  identical reference) — pass a new `data` object to revalidate.

### Added

- Error formatting now understands both AJV error shapes: the AJV 8+
  `instancePath` (JSON Pointer, RFC 6901 — including `~0`/`~1` escape
  decoding) in addition to the legacy AJV 6 `dataPath` (kept as a
  deprecated fallback for injected AJV 6 instances, see Breaking above).
  The conversion lives in a new internal `pointerToFieldPath(pointer)`
  helper (not part of the public API).
- `resetOnSubmit` prop on `<Form>` — set it to `false` to keep the
  touched/submitted state after a successful submit (useful when the
  server-side submit can still fail), then call the context's `reset()`
  once it succeeds. Defaults to `true` (previous behavior, backward
  compatible).
- `reset()` exposed through the form context (`useFormContext().reset`) —
  lets descendants (e.g. a reset button) reset the form state without
  holding a ref to the `<Form>` instance.

### Fixed

- `<FieldError>` no longer attaches `defaultProps` to its public
  function wrapper — that pattern is deprecated in React 18.3 (runtime
  warning "Support for defaultProps will be removed from function
  components") and silently ignored by React 19. The defaults were
  already applied by the internal class component, so behavior is
  unchanged on every supported React version; the warning is simply
  gone. Class components (`<Form>`, and `<Field>`'s implementation)
  keep their `defaultProps`, which remain fully supported.
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

[Unreleased]: https://github.com/53js/react-jsonschema-form-validation/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/53js/react-jsonschema-form-validation/compare/v0.6.0...v0.7.0
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
