# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Only user-visible changes are listed. Internal refactors, tooling churn
and dependency-only bumps are omitted.

## [Unreleased]

The 1.0 line implements [RFC 0001](https://github.com/53js/react-jsonschema-form-validation/pull/58)
(DOM-first form API): `useForm`, Standard Schema validators, one form store.
The README carries a single migration guide, "Migrating from 0.x to 1.0".

### Breaking

- **React 18 is the minimum supported version** (`peerDependencies:
  react >=18`): the hooks architecture relies on `useId` and
  `useSyncExternalStore`, without shims. React 16.8 / 17 stay served by
  the 0.x line.
- **AJV upgraded from v6 to v8** (`ajv@^8.17.0`). No code change is needed
  if you only pass `schema`/`data` and read errors through `<FieldError>`
  or `error.field`. Otherwise:
  - Raw errors carry the AJV 8 shape: `instancePath` (JSON Pointer, e.g.
    `/user/email`) replaces `dataPath` (`.user.email`). The normalized
    `field` (`user.email`) is unchanged.
  - Default message wording changed in AJV 8 (`should …` → `must …`, e.g.
    `must have required property 'email'`). Code or tests matching on
    default messages must be updated; `errorMessages` maps are immune.
  - String formats (`email`, `date`, `uri`…) now come from the new
    `ajv-formats` dependency (AJV 8 removed them from core), registered on
    the default instance in its default `full` mode — stricter than AJV 6
    on some edge values. Custom instances must call `addFormats(ajv)`
    themselves if they rely on formats.
  - The default instance is created with `strict: false`, keeping AJV 6's
    permissive behavior (unknown keywords compile instead of throwing).
    One safety net is lost: AJV 6 threw at compile time on an unknown
    **format name** (`format: 'emial'`), whereas AJV 8 with
    `strict: false` only logs a warning and ignores the format — every
    value then passes silently. Pass your own strict-mode instance to
    restore compile-time typo detection.
  - AJV ≥ 8 is required for a custom instance passed through `ajv`:
    errors in the AJV 6 shape (`dataPath`) are still understood as a soft
    landing, but AJV 6 instances are unsupported. The option is duck-typed (any object
    exposing `compile(schema)`), so `Ajv2019` / `Ajv2020` instances — e.g.
    for JSON Schema draft 2020-12 — are accepted; a non-validator throws.
- **`<Form>`, `<Field>` and `<FieldError>` are function components on a
  form store.** The class components are gone: a `ref` on `<Form>` now
  yields the `<form>` DOM element, and the instance methods / `state`
  reached through a ref are replaced by the `useForm()` api
  (`form.valid`, `form.errors`, `form.reset()`…).
- **The form context value is the `FormApi`** (`useFormContext()` /
  `withFormContext()`): the `FormContextValue` type is replaced by
  `FormApi`, `formId` by `id`, and the internal `fieldErrorsVersion` is
  gone; `valid`, `errors`, `isSubmitted`, `touchedFields`, `reset`,
  `getFieldErrors`, `isFieldInvalid`, `isFieldTouched`, `isTouched`,
  `touch`, `handleFieldChange`, `errorMessages` are unchanged.
- **Errors are normalized `FormError`s** everywhere
  (`{ field, code, message, params, raw }`, the `FormattedError` type is
  gone): `errorMessages` maps (form-level and `<FieldError>`-level) are
  keyed by `error.code` instead of the AJV keyword — for AJV users only
  `minimum`/`exclusiveMinimum` → `min` and `maximum`/`exclusiveMaximum` →
  `max` change — and message callbacks receive the `FormError`:
  `error.keyword` becomes `error.code`, `error.data` (the current value)
  becomes `error.raw.data`, `error.schema` / `error.parentSchema` become
  `error.raw.schema` / `error.raw.parentSchema`.
- **`reset()` is presentation-only**: it clears `touchedFields` /
  `isSubmitted` and keeps `errors` / `valid` describing the current `data`
  (0.x reported `valid: true` until the next change). **Submitting always
  re-validates synchronously first** (0.x trusted the last throttled
  result).
- **`<FieldError>` default ids** derive from the form id, now a `useId()`
  value (`:r0:-error-email`) instead of the `jfv<N>` counter
  (`jfv1-error-email`). Pass `<Form id>` / `useForm({ id })` for
  predictable ids.
- **A custom `<Form component={Wrapper}>` must forward the `id` and
  `onSubmit` props** to the element it renders: native controls are now
  associated through the `form` attribute pointing at `form.id` (0.x
  associated by ancestry only). A wrapper swallowing `id` de-associates
  its fields (Enter-to-submit, `form.elements`, `requestSubmit()`); a
  dev-time `console.error` flags it.

### Added

- **`useForm()` and the hook mode of `<Form>`**: own the form state in the
  component that renders the form — `const form = useForm({ schema, data,
  onChange }); <Form form={form} onSubmit={…}>` — and read `form.valid`,
  `form.errors`, `form.touchedFields`, `form.isSubmitted` right where the
  submit button lives. The 5-line sugar mode (`<Form schema data onChange>`)
  is unchanged. The two modes are mutually exclusive at the type level.
- Imperative API named after `HTMLFormElement`: `form.checkValidity()`,
  `form.reportValidity()` (reveal + focus the first invalid control of
  this form), `form.requestSubmit()`, `form.reset()`.
- `<Field form={form}>` / `<FieldError form={form}>`: explicit association
  for fields rendered outside the `<Form>` subtree (portals); native
  controls always carry `form={form.id}`, so the DOM association (Enter to
  submit, `form.elements`) follows the React one. Ids come from `useId()`
  or `useForm({ id })` / `<Form id>`.
- Per-field subscriptions: `<Field>` / `<FieldError>` re-render only when
  their own state changes; `useFormSelector(form, selector, isEqual?)` is
  exported for custom consumers, and `form.subscribe()` / `form.getState()`
  expose the store to external subscribers.
- **Standard Schema validators.** `schema` accepts any object implementing
  [Standard Schema v1](https://standardschema.dev) (`~standard`): Zod,
  Valibot, ArkType, Effect Schema… Their error codes pass through as-is.
- New entry `react-jsonschema-form-validation/core`: the library without
  the AJV provider, for Standard Schema users (AJV never enters the bundle).
- New entry `react-jsonschema-form-validation/providers/ajv`:
  `ajvSchema(jsonSchema, { ajv })` wraps a JSON Schema into a Standard
  Schema object (compiled once; `createAjv()` builds an instance configured
  like the default one). The root entry wraps a plain JSON Schema
  automatically, once per `(schema, ajv)` identity.
- Normalized error-code core (`required`, `type`, `min`, `max`,
  `minLength`, `maxLength`, `pattern`, `format`, `enum`); AJV keywords
  outside it (`const`, `multipleOf`, `uniqueItems`, `minItems`,
  `maxItems`, `oneOf`/`anyOf`, `additionalProperties`…) pass through under
  their own name. `raw` keeps the verbose AJV error, so `raw.data` is the
  current field value (issue #6).
- Types: `FormApi`, `FormState`, `FormError`, `ErrorCode`,
  `StandardSchema`, `AjvLike`; runtime guards `isStandardSchema` /
  `runSchema`.
- Server rendering: the first validation runs synchronously when the form
  is created, so `renderToString` outputs the right `valid` / errors with
  `useId`-stable ids; the client-boundary modules carry `'use client'`
  (Next.js App Router).
- Sync-only guard: a schema whose `validate()` returns a Promise (async
  refinement, AJV `$async`) throws an explicit error instead of
  validating stale data.

### Removed

- `prop-types` is no longer a dependency (props are typed by the shipped
  `.d.ts`); the runtime `ajv` duck-typing check is now a thrown error.
- Deep imports: only the package entries exist
  (`react-jsonschema-form-validation`, `…/core`, `…/providers/ajv`);
  `…/dist/Form/Form` & co were never documented, were already outside the
  `exports` map since 0.7, and no longer exist.

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
