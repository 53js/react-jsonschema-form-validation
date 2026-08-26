# React JSON Schema Form Validation

[![npm](https://img.shields.io/npm/v/react-jsonschema-form-validation.svg?style=flat)](https://npmjs.org/package/react-jsonschema-form-validation "View this project on npm")
[![CI](https://github.com/53js/react-jsonschema-form-validation/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/53js/react-jsonschema-form-validation/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)

Validate forms with powerful JSON Schema and Ajv — or with any
[Standard Schema](https://standardschema.dev) validator (Zod, Valibot, ArkType…).

This library links a schema, a form and your data to :
- describe your data model with JSON Schema (AJV bundled) or a Standard Schema object
- validate the form data on every change
- display & customize error messages, with the ARIA wiring done for you
- use your own graphical components to build friendly user forms.

## Why RJFV ?
- Simplicity (no extraneous features, just what you need)
- DOM-first: the platform already solves form association, focus management
  and submit — the library leans on it instead of re-implementing it
- Performance (AJV is extremely fast _:zap:_, and each `<Field>` re-renders
  only when its own state changes)
- Actively maintained
- The simplest react JSON Schema validation module ever published on npm ! :v:

Other JSON Schema validation modules published on NPM are often complex, with too much features.
That's why we created react-jsonschema-form-validation.
You'll just need a schema, a form, some fields, and your data. Nothing more. <i class="fa fa-arrow-right"></i> it's S I M P L E

Our philosophy :
- focused on validation, not UI
- controlled data: you own `data`, the library validates and reports
- highly customizable
- minimal CSS : just a red color to show error message (can be overriden)

## Installation

```bash
npm install react-jsonschema-form-validation
```

```bash
yarn add react-jsonschema-form-validation
```

Peer dependency: `react >= 18` (React 16.8 / 17 are served by the 0.x line).

The root entry bundles AJV 8 (with `ajv-formats`), so a plain JSON Schema
works out of the box. Two more entries are published:

| Import | What you get |
| --- | --- |
| `react-jsonschema-form-validation` | components, hooks and the JSON Schema sugar: a plain JSON Schema passed as `schema` is wrapped by the AJV provider automatically |
| `react-jsonschema-form-validation/core` | the same components and hooks, Standard Schema only — for Zod / Valibot / ArkType users: AJV never enters the bundle |
| `react-jsonschema-form-validation/providers/ajv` | `ajvSchema(jsonSchema, { ajv })` and `createAjv()` — wrap a JSON Schema with a custom AJV instance |

Then import the packaged stylesheet — the minimal CSS mentioned above (a red
color for error messages, easily overridden):

```js
import 'react-jsonschema-form-validation/dist/react-jsonschema-form-validation.css';
```

A minified variant is also shipped:
`react-jsonschema-form-validation/dist/react-jsonschema-form-validation.min.css`.

## Getting started

Import modules:
```js
import React, { useState } from 'react';
import { Field, FieldError, Form } from 'react-jsonschema-form-validation';
```

Define your JSON-Schema:
```js
const demoSchema = {
	type: 'object',
	properties: {
		email: { type: 'string', format: 'email' },
	},
	required: [
		'email',
	],
};
```

Declare your `Form`, `Field` and `FieldError` components.
Pass your schema and your data to the Form props.

```jsx
const DemoForm = (props) => {
	const [formData, setFormData] = useState({ email: '' });

	const handleChange = (newData) => {
		// newData is a copy of the object formData with properties (and nested properties)
		// updated using immutability pattern for each change occured in the form.
		setFormData(newData);
	};

	const handleSubmit = () => {
		const { doWhateverYouWant } = props;
		doWhateverYouWant(formData); // Do whatever you want with the form data
	};

	return (
		<Form
			data={formData}
			onChange={handleChange}
			onSubmit={handleSubmit}
			schema={demoSchema}
		>
			<label>Email :</label>
			<Field
				name="email"
				value={formData.email}
			/>
			<FieldError name="email" />
			<button type="submit">Submit</button>
		</Form>
	);
};
```

🎵 _That's all folks !_

`onSubmit` is only called when the data matches the schema. On a failed
submit the errors are revealed and focus moves to the first invalid field.

## Hook mode: `useForm`

The example above (*sugar mode*) is all you need until the component that
renders the `<Form>` wants to read the form state — disable the submit
button while the form is invalid, show an error summary, reset after a
server round-trip. Then own the form with `useForm` and hand it to
`<Form form={form}>`:

```jsx
import { Field, FieldError, Form, useForm } from 'react-jsonschema-form-validation';

const CheckoutForm = ({ save }) => {
	const [data, setData] = useState({ email: '' });
	const form = useForm({ schema: demoSchema, data, onChange: setData });

	const handleSubmit = async () => {
		await save(data);
		setData({ email: '' });
		form.reset(); // clears the touched/submitted state
	};

	return (
		<Form form={form} onSubmit={handleSubmit} resetOnSubmit={false}>
			<Field name="email" value={data.email} />
			<FieldError name="email" />
			<button type="submit" disabled={!form.valid}>Save</button>
		</Form>
	);
};
```

`useForm` takes the validation configuration —
`{ schema, data, onChange, errorMessages, throttleDuration, id }` (plus
`ajv` on the root entry) — and `<Form>` keeps the submit-time props in both
modes: `onSubmit` (required), `resetOnSubmit`, `scrollToError`,
`scrollOptions`, `component`, `className`. The two modes are mutually
exclusive: passing `form` together with `schema`, `data`, `onChange`,
`errorMessages`, `throttleDuration`, `ajv` or `id` is a TypeScript error
(the `id` belongs to `useForm({ id })` in hook mode).

`data` and `errorMessages` may be inline literals recreated on every render
(re-validation is skipped when `data` is structurally equal to the last
validated value). The schema, however, should be stable: with the root
entry an inline JSON Schema literal is recompiled by AJV on every render of
the owner — hoist it to a module constant or a `useMemo`.

### The `FormApi` object

`useForm()` returns a referentially stable object (the same one
`useFormContext()` returns to descendants). Its reactive members are getters
over the current state — always up to date, in render as in event handlers —
and any change re-renders the component that called `useForm`.

| Member | Description |
| --- | --- |
| `valid` | `true` when the data matches the schema |
| `errors` | Current validation errors (`FormError[]`, see [Errors](#errors-and-custom-messages)) |
| `touchedFields` | Names of the fields that have been blurred |
| `isSubmitted` | `true` once a submit has been attempted (cleared by `reset()`) |
| `errorMessages` | The `errorMessages` map in effect, if any |
| `id` | The form id (see [ids](#field-association-and-ids)) |

Imperative API, named after `HTMLFormElement`:

| Member | Description |
| --- | --- |
| `reset()` | Clears `touchedFields` and `isSubmitted`. Presentation only: `errors` / `valid` keep describing the current `data`, and `data` itself is yours to reset. Called automatically after a successful submit unless `resetOnSubmit={false}` |
| `checkValidity()` | Validates `data` now, synchronously (a pending throttled run is dropped), with no UI side effect. Returns `true` when valid |
| `reportValidity()` | `checkValidity()` + marks the form submitted (errors are revealed) + focuses the first invalid field, unless `scrollToError={false}`. Returns `true` when valid |
| `requestSubmit()` | Submits through the native `HTMLFormElement.requestSubmit()`, so `onSubmit` runs as if the user clicked the button. Throws when the `<Form>` is not mounted |

Field helpers (`names` is a field path or an array of paths, wildcards such
as `emails.*` work):

| Member | Description |
| --- | --- |
| `getFieldErrors(names)` | Errors of the given fields |
| `isFieldInvalid(names)` | `true` if any of the given fields has an error |
| `isFieldTouched(names)` | `true` if any of the given fields was touched |
| `isTouched()` | `true` if at least one field was touched |
| `touch(names)` | Marks fields as touched |
| `handleFieldChange(event)` or `handleFieldChange(name, value)` | Applies a change programmatically (calls your `onChange` with the updated data) |

For external subscribers — a custom hook, a devtools panel, a Constraint
Validation projection — the store itself is exposed: `subscribe(listener)`
and `getState()` return the immutable `FormState` snapshot
`{ valid, errors, touchedFields, isSubmitted, fieldErrorRegistry, errorMessages }`.
Components should rather use `useFormSelector(form, selector, isEqual?)`,
which re-renders only when the selected slice changes (shallow equality by
default):

```jsx
const touchedCount = useFormSelector(form, (state) => state.touchedFields.length);
```

(`handleSubmit`, `getFieldErrorDescribedBy`, `registerFieldError` and
`unregisterFieldError` are also on the object — internal wiring between
`<Form>`, `<Field>` and `<FieldError>`.)

Validation runs synchronously when the form is created (the first render
already sees the right `valid`), then throttled on every `data` change
(200 ms by default, `throttleDuration`), so `valid` can lag one beat behind
the latest keystroke. Submitting always re-validates synchronously first: a
pending run never lets stale data through.

## Field association and ids

`<Field>` and `<FieldError>` follow the HTML rules for form-associated
elements:

1. **Default: the nearest `<Form>` ancestor** (React context) — nothing to
   repeat on each field.
2. **The `form` prop** — the React counterpart of HTML's `form=""`
   attribute, for a field rendered outside the `<Form>` subtree (a modal, a
   drawer, a portal) or targeting another form. It takes the `FormApi`
   object, not a string id.
3. **Neither → the component throws.** HTML silently de-associates an
   orphan control; the library fails loudly instead.

On native controls (`input`, `select`, `textarea`, `button`, …) `<Field>`
also sets the native `form` attribute to the form id, so the DOM association
always matches the React one: Enter-to-submit and `form.elements` keep
working through a portal. Because the association goes through that
attribute, a custom `<Form component={Wrapper}>` must forward the `id` (and
`onSubmit`) props to the element it renders — a wrapper swallowing `id`
de-associates its fields (Enter-to-submit, `form.elements` and
`requestSubmit()` stop working); a dev-time `console.error` flags it.

On a failed submit, `reportValidity()` focuses the first invalid control of
*this* form (looked up through `form.elements`), so two forms sharing field
names on the same page stay independent.

```jsx
const form = useForm({ schema, data, onChange: setData, id: 'checkout' });

<>
	<Form form={form} onSubmit={handleSubmit}>
		<Field name="email" value={data.email} />
		<FieldError name="email" />
	</Form>

	{createPortal(
		<Dialog>
			<Field name="promoCode" form={form} value={data.promoCode} />
			<FieldError name="promoCode" form={form} />
		</Dialog>,
		document.body,
	)}

	{/* A hand-written control can target the form by id, plain HTML */}
	<button type="submit" form="checkout">Pay</button>
</>
```

**ids.** The form id is generated with React's `useId()` — stable between
server and client, unique across forms — or supplied by you:
`useForm({ id: 'checkout' })` in hook mode, `<Form id="checkout">` in sugar
mode. It is rendered on the `<form>` element and every ARIA id derives from
it (`<FieldError>` renders `` `${form.id}-error-${name}` ``). Pick your own
id when you need readable, predictable ids (`useId()` yields `:r0:`-style
values on React 18).

## Validation

### Standard Schema

`schema` accepts any object implementing
[Standard Schema v1](https://standardschema.dev) (a `~standard` property):
Zod (≥ 3.24), Valibot, ArkType, Effect Schema… Import from the `/core` entry
to keep AJV out of your bundle:

```jsx
import { z } from 'zod';
import { Field, FieldError, Form } from 'react-jsonschema-form-validation/core';

const schema = z.object({
	email: z.string().email(),
	age: z.number().min(18),
});

<Form data={data} onChange={setData} onSubmit={handleSubmit} schema={schema}>
	<Field name="email" value={data.email} />
	<FieldError name="email" />
	<Field name="age" type="number" value={data.age} />
	<FieldError name="age" />
	<button type="submit">Submit</button>
</Form>
```

The `/core` entry validates exactly what it is given: no empty-value
normalization, no code mapping (see [error codes](#error-codes)).

### JSON Schema (AJV)

On the root entry a plain JSON Schema passed as `schema` is wrapped by the
AJV provider automatically (once per `schema` identity — keep the schema
object stable, outside the component or in a `useMemo`). The default AJV 8
instance is created with `allErrors`, `$data` references, `verbose` errors,
`strict: false` (unknown keywords compile instead of throwing) and the
string formats of `ajv-formats`. Before validating, the provider normalizes
empty inputs (`''` and `null` become `undefined`) so that `required` flags
an empty field.

To use your own instance — strict mode, another JSON Schema draft, custom
keywords — pass it as `ajv`, or wrap the schema yourself with
`ajvSchema` from the `providers/ajv` entry. Any object exposing
`compile(schema)` is accepted (`Ajv`, `Ajv2019`, `Ajv2020`…); register
`ajv-formats` yourself if the schema uses string formats.

```jsx
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { ajvSchema, createAjv } from 'react-jsonschema-form-validation/providers/ajv';

const ajv = new Ajv2020({ allErrors: true, $data: true }); // strict by default
addFormats(ajv);

// Root entry: the `ajv` option / prop
const form = useForm({ schema: jsonSchema, ajv, data, onChange: setData });
<Form ajv={ajv} schema={jsonSchema} data={data} onChange={setData} onSubmit={handleSubmit} />

// Any entry: wrap explicitly (compiled once — do it outside render or memoize it)
const schema = ajvSchema(jsonSchema, { ajv });
// createAjv() returns an instance configured like the default one
const schema2 = ajvSchema(jsonSchema, { ajv: createAjv() });
```

The default instance is shared by every wrapped schema: two schemas
declaring the same `$id` collide at compile time (AJV throws) — give them
dedicated instances.

### Synchronous only

Standard Schema lets `validate()` return a Promise (async refinements).
The library validates on every change and keeps no stale-result handling,
so an async schema throws an explicit error — so does an AJV `$async: true`
schema. Async validation may come in a 1.x.

## Errors and custom messages

Every error, whatever the validator, has the same shape:

```ts
interface FormError {
	field: string;                    // dot-path: 'user.email', 'items.0.label' ('' at the root)
	code: string;                     // normalized code (below), or the provider's own
	message: string;                  // the provider's default message
	params: Record<string, unknown>;  // provider parameters (AJV: { limit }, { missingProperty }…)
	raw: unknown;                     // the original provider error, untouched
}
```

### Error codes

A small core of codes is normalized so that `errorMessages` maps stay
portable across validators:

| Code | AJV keywords |
| --- | --- |
| `required` | `required` |
| `type` | `type` |
| `min` | `minimum`, `exclusiveMinimum` |
| `max` | `maximum`, `exclusiveMaximum` |
| `minLength` | `minLength` |
| `maxLength` | `maxLength` |
| `pattern` | `pattern` |
| `format` | `format` |
| `enum` | `enum` |

Everything else passes through under the provider's own code, with the full
detail in `raw`: for AJV that means `const`, `multipleOf`, `uniqueItems`,
`minItems`, `maxItems`, `oneOf` / `anyOf`, `additionalProperties`… and any
custom keyword. Zod issues keep Zod's codes (`invalid_type`, `too_small`,
`too_big`, `invalid_format`…); `params` is `{}` and `raw` is the Zod issue.

### Custom messages

Pass an `errorMessages` map (code → function) to `<Form>` / `useForm` —
or to a single `<FieldError>` — to replace the validator's messages. Each
function receives the `FormError`. The form-level map reaches every
`<FieldError>` through the context (portals included). Resolution order:
the `<FieldError>` map, then the form map, then the `defaultMessage`
catch-all, then the provider's message.

With the AJV provider, `raw` is the verbose AJV error: `raw.data` is the
current value of the offending field, so messages can quote what the user
actually typed:

```jsx
<Form
	data={formData}
	errorMessages={{
		minLength: (e) => `"${e.raw.data}" is too short (min ${e.params.limit} characters)`,
		format: (e) => `"${e.raw.data}" is not a valid ${e.params.format}`,
		required: () => 'This field is required',
		defaultMessage: (e) => `Invalid value (${e.code})`,
	}}
	onChange={handleChange}
	onSubmit={handleSubmit}
	schema={demoSchema}
>
	<Field name="email" value={formData.email} />
	<FieldError name="email" errorMessages={{ format: () => 'Please enter a valid email' }} />
	<button type="submit">Submit</button>
</Form>
```

What `raw.data` contains, per error type:

- value-level keywords (`minLength`, `format`, `enum`, `const`, `pattern`,
  `min`, … including `$data` references): the current value of the field;
- `required`: the **parent object** missing the property (AJV reports
  `required` on the parent — the missing value itself does not exist).
  `error.field` already points at the missing property.

The AJV error also exposes `raw.schema` (the failing keyword's value, e.g.
`5` for `minLength: 5`) and `raw.parentSchema` (the enclosing subschema).

> **Serialization & logging** — a `required` error carries the *entire
> parent object* in `raw.data`. A `JSON.stringify(errors)` shipped to
> monitoring can therefore exfiltrate sensitive sibling fields (a password
> next to the missing property), and cyclic data would make `stringify`
> throw. Log a projection (`field`, `code`, `message`) rather than raw
> error objects.

> **Note** — `raw.data` comes from AJV's `verbose` option, enabled on the
> default instance and by `createAjv()`. If you build your own instance,
> set `verbose: true` yourself.

## Accessibility

`<Field>` and `<FieldError>` wire the essential ARIA attributes for you — no
extra props needed:

- `<FieldError>` renders with `role="alert"` by default, so assistive
  technologies announce the message as soon as it appears. Pass your own
  `role` prop to override it.
- `<Field>` sets `aria-invalid="true"` on the rendered element when the field
  is invalid **and** revealed (touched, or the form was submitted) — the same
  condition as the visual error styling, so nothing is announced on a
  pristine form. It is a plain default: an explicit `aria-invalid` prop wins.
- `aria-describedby` is wired automatically: each `<FieldError>` registers its
  `id` in the form, and the matching `<Field>` references those ids once the
  field is revealed. The default id is deterministic —
  `<form id>-error-<name>` — so two forms on the same page never collide. A
  custom `id` prop on `<FieldError>` is followed automatically.
- An `aria-describedby` you pass to `<Field>` yourself is **merged**, not
  replaced: your ids come first (e.g. a hint text), the error ids after.
- On a failed submit, keyboard focus moves to the first invalid field, which
  is scrolled into view (disable with `scrollToError={false}` on `<Form>`;
  tune with `scrollOptions={{ behavior, block, inline }}`, forwarded to
  `scrollIntoView` — defaults `smooth` / `center` / `nearest`).

```jsx
<Form id="signup" data={formData} onChange={handleChange} onSubmit={handleSubmit} schema={demoSchema}>
	<span id="email-hint">We never share your email.</span>
	<Field name="email" aria-describedby="email-hint" value={formData.email} />
	<FieldError name="email" />
	{/* Once the field is touched (or the form submitted) and invalid,
	    the input renders:
	    aria-invalid="true" aria-describedby="email-hint signup-error-email" */}
</Form>
```

The default error id can be computed with the exported helper:

```js
import { getFieldErrorId } from 'react-jsonschema-form-validation';

getFieldErrorId(form.id, 'email'); // 'signup-error-email'
```

Known limitations:

- Rendering several `<FieldError>` with the same `name` in one form produces
  duplicate default ids (invalid HTML). Override `id` on all but one of them.
- A `name` containing spaces cannot be referenced through the generated
  `aria-describedby` (it is a space-separated id list). Give such a
  `<FieldError>` a custom `id`.

## Styling

Classnames are the styling mechanism. Each component carries a stable class
plus state modifiers:

| Component | Class | Modifiers |
| --- | --- | --- |
| `<Form>` | `Jfv_Form` | `isSubmitted` |
| `<Field>` | `Jfv_Field` | `isInvalid`, `isTouched`, `isSubmitted` |
| `<FieldError>` | `Jfv_FieldError` | `isTouched`, `isSubmitted` |

The packaged stylesheet paints a red border on `.Jfv_Field.isInvalid` once
touched or submitted, and reveals `.Jfv_FieldError` once submitted. Override
it, or skip it and style the classes yourself (`className` is merged on
every component). `<form>` is rendered with `noValidate`, so the browser's
own bubbles stay out of the way.

## Reading the form state: useFormContext

Descendants of a `<Form>` get the `FormApi` through the `useFormContext()`
hook (a legacy render-prop helper, `withFormContext(cb)`, also exists). Both
throw a descriptive error when used outside a `<Form>`. Prefer
[hook mode](#hook-mode-useform) when the reader *is* the component rendering
the `<Form>`.

```js
import { useFormContext } from 'react-jsonschema-form-validation';
```

**Disable the submit button while the form is invalid:**

```jsx
const SubmitButton = ({ children }) => {
	const { valid } = useFormContext();
	return (
		<button type="submit" disabled={!valid}>
			{children}
		</button>
	);
};
```

**Show an error summary after a failed submit:**

```jsx
const ErrorSummary = () => {
	const { errors, isSubmitted } = useFormContext();
	if (!isSubmitted || !errors.length) return null;
	return (
		<ul>
			{errors.map((error) => (
				<li key={`${error.field}-${error.code}`}>
					{`${error.field}: ${error.message}`}
				</li>
			))}
		</ul>
	);
};
```

Use them anywhere inside the `<Form>`:

```jsx
<Form data={formData} onChange={handleChange} onSubmit={handleSubmit} schema={demoSchema}>
	<ErrorSummary />
	<Field name="email" value={formData.email} />
	<FieldError name="email" />
	<SubmitButton>Submit</SubmitButton>
</Form>
```

The two hooks differ in granularity: `useFormContext()` is the coarse path —
the component re-renders like the form owner does, on every state change —
while `useFormSelector(form, selector)` re-renders only when the selected
slice changes (see [`FormApi`](#the-formapi-object)).

## Server rendering and frameworks

- **SSR** works with `renderToString`: ids come from `useId()`, the first
  validation runs synchronously on the server and the output is
  deterministic (a `disabled={!form.valid}` button renders right on the
  first paint, no hydration mismatch).
- **Next.js App Router**: the client-boundary modules (`Form`, `Field`,
  `FieldError`, `useForm`, `useFormSelector`, the context) carry
  `'use client'`, so they can be imported directly from a Server Component
  tree.
- **Edge runtimes**: the AJV provider compiles schemas with `new Function`,
  which is unavailable on runtimes that forbid code generation (Cloudflare
  Workers, Vercel Edge, a strict `Content-Security-Policy` without
  `unsafe-eval`). There, use a Standard Schema validator through the `/core`
  entry, or precompile your JSON Schemas with AJV's standalone code
  generation.

## TypeScript

The library is fully typed — `.d.ts` declarations ship with the package for
each entry (root, `/core`, `/providers/ajv`), no `@types/...` required.

```ts
import type {
	FormProps,         // FormProps<T, C>: the hook-mode | sugar-mode union, T = data shape, C = wrapper element
	FieldProps,        // FieldProps<C> — C = underlying component (its props are inferred)
	FieldErrorProps,   // FieldErrorProps<C>
	FormApi,           // FormApi<T>: what useForm<T>() and useFormContext<T>() return
	FormState,         // the store snapshot (getState / useFormSelector)
	FormError,
	ErrorCode,         // the normalized codes, plus any string
	ErrorMessageFn,
	ErrorMessagesMap,
	StandardSchema,
} from 'react-jsonschema-form-validation';
import type { AjvLike } from 'react-jsonschema-form-validation/providers/ajv';
```

`useForm<T>({ schema, data, onChange })` infers `T` from `data` / `onChange`
(or takes it explicitly), and `onChange` receives a `T`. `<Form<T>>` does the
same in sugar mode. The `/core` entry's `schema` only accepts a
`StandardSchema`: a plain JSON Schema there is a type error, as is `ajv`.

## Migrating from 0.x to 1.0

> **Status** — 1.0 implements [RFC 0001](https://github.com/53js/react-jsonschema-form-validation/pull/58)
> (DOM-first form API). One difference from the RFC text: the AJV provider
> ships as `react-jsonschema-form-validation/providers/ajv`, not `/ajv`.

If you only pass `schema` / `data` / `onChange` / `onSubmit` and read errors
through `<FieldError>`, the 5-line usage is unchanged and no code change is
required. Otherwise, go through the list:

- **React 18 is the minimum** (`peerDependencies: react >= 18`): the
  library relies on `useId` and `useSyncExternalStore`, without shims.
  React 16.8 / 17 stay served by the 0.x line.

- **AJV 6 → [AJV 8](https://ajv.js.org/v6-to-v8-migration.html)**:
  - `errors[].dataPath` → `errors[].instancePath` — AJV 8 errors carry a
    JSON Pointer `instancePath` (`/user/email`) instead of the dot-notation
    `dataPath` (`.user.email`). The normalized `error.field` (`user.email`)
    is unchanged; code reading the raw path must switch to
    `error.raw.instancePath`.
  - **Error message wording changed** — AJV 8 says `must be ...` where AJV 6
    said `should be ...` (e.g. `must have required property 'email'`). If you
    match on default messages (tests, custom logic), update the wording — or
    rather map messages by `error.code` via `errorMessages`, which is immune
    to wording changes.
  - **String formats now come from `ajv-formats`** — AJV 8 removed built-in
    formats (`email`, `date`, `uri`…). The default instance restores them via
    [`ajv-formats`](https://github.com/ajv-validator/ajv-formats) in its
    default `full` validation mode, which is stricter than AJV 6's on some
    edge values. If you pass a custom `ajv` instance and rely on formats,
    call `addFormats(ajv)` yourself.
  - **The default instance keeps AJV 6's permissive behavior** — it is
    created with `strict: false`: schemas containing unknown keywords still
    compile instead of throwing. One AJV 6 safety net is lost: AJV 6 threw
    at compile time on an unknown format name (a typo like `format: 'emial'`
    crashed immediately), while AJV 8 with `strict: false` only logs a
    warning and ignores the format — every value then passes silently, so
    double-check your format names, or pass a strict instance (see
    [JSON Schema (AJV)](#json-schema-ajv)).
  - **AJV ≥ 8 is required for a custom `ajv` instance.** Errors in the
    AJV 6 shape (`dataPath`) are still understood as a soft landing, but
    AJV 6 instances are unsupported.

- **`errorMessages` keys are error codes, not AJV keywords.** For AJV users
  only four keys change:

  | 0.x key | 1.0 key |
  | --- | --- |
  | `minimum`, `exclusiveMinimum` | `min` |
  | `maximum`, `exclusiveMaximum` | `max` |

  Every other AJV keyword (`required`, `minLength`, `format`, `enum`,
  `multipleOf`…) keeps its name. `defaultMessage` is unchanged.

- **Errors are `FormError`s** — the message callbacks and `form.errors`
  receive `{ field, code, message, params, raw }` instead of the enriched
  AJV error:

  | 0.x | 1.0 |
  | --- | --- |
  | `error.keyword` | `error.code` |
  | `error.data` (current value, 0.7) | `error.raw.data` |
  | `error.schema`, `error.parentSchema` | `error.raw.schema`, `error.raw.parentSchema` |
  | `error.dataPath` / `error.instancePath` | `error.raw.instancePath` (or `error.field`) |
  | `error.params`, `error.message`, `error.field` | unchanged |
  | `FormattedError` type | `FormError` |

- **The form context value is the `FormApi`** — `FormContextValue` is
  replaced by `FormApi` and `formId` by `id`. `valid`, `errors`,
  `isSubmitted`, `touchedFields`, `reset`, `getFieldErrors`,
  `isFieldInvalid`, `isFieldTouched`, `isTouched`, `touch`,
  `handleFieldChange`, `errorMessages` are unchanged; the internal
  `fieldErrorsVersion` is gone.

- **Class components and instance refs are gone.** `<Form>`, `<Field>` and
  `<FieldError>` are function components: a `ref` on `<Form>` now yields the
  `<form>` DOM element, and `formRef.current.reset()` / `.state` no longer
  exist — use `useForm` (`form.reset()`, `form.valid`…) instead. Your own
  components can still be classes: sugar mode needs no hook.

- **`reset()` no longer clears `errors` / `valid`.** It resets the
  touched/submitted state only; `errors` and `valid` keep describing the
  current `data` (0.x reported `valid: true` until the next change).
  `reset()` never touched `data` and still does not — reset your own state
  alongside. `resetOnSubmit` works as before.

- **Submit re-validates synchronously.** 0.x trusted the last (throttled)
  result; 1.0 always runs one validation before calling `onSubmit`, so a
  submit right after a keystroke sees the final data.

- **`<FieldError>` default ids** derive from the form id, which is now a
  `useId()` value (`:r0:`) instead of the `jfv<N>` counter: an id such as
  `jfv1-error-email` becomes `:r0:-error-email`. Anything that depended on
  the `jfv` prefix (CSS selectors, tests) should pass an explicit id
  (`<Form id="signup">` → `signup-error-email`) or read `form.id` /
  `getFieldErrorId(form.id, name)`.

- **A custom `<Form component={Wrapper}>` must forward `id` and
  `onSubmit`.** 0.x associated fields by ancestry only; 1.0 associates
  native controls through the `form` attribute pointing at `form.id`, so a
  wrapper that swallows `id` de-associates its fields (Enter-to-submit,
  `form.elements`, `requestSubmit()`). A dev-time `console.error` flags it.

- **`prop-types` is no longer a dependency**: props are typed by the shipped
  `.d.ts` only. A broken `ajv` instance (no `compile` function) is now a
  thrown error instead of a prop-types warning.

- **Deep imports are gone.** `react-jsonschema-form-validation/dist/Form/Form`
  & co no longer exist (they were already outside the `exports` map since
  0.7 and never documented); use the three entries: the root, `/core`,
  `/providers/ajv`.

## Known limitations

- Validation is synchronous only: a schema whose `validate()` returns a
  Promise (async refinements, AJV `$async`) throws.
- The AJV provider needs `new Function` — see
  [Server rendering and frameworks](#server-rendering-and-frameworks) for
  edge runtimes and strict CSPs.
- Property names containing a dot (`.`) or a slash (`/`) are not supported
  in field `name`s: the library addresses fields with dot-separated paths
  (`user.email`), so such keys cannot be addressed unambiguously.
- Non-DOM components calling `onChange` with several arguments
  (`onChange(value, meta)`, `react-select` style): `<Field>` only reads the
  first argument — a custom `onChange` prop on `<Field>` receives it plus
  `handleFieldChange`, never the extra ones. When they matter, wrap the
  component in an adapter that folds them into the value it emits.

## Examples
We’ve got many examples, from the most simple to the most advanced.

Live examples are available : [here](https://53js.github.io/react-jsonschema-form-validation/#/examples/ "examples")

## Documentation

📃 Check out our documentation : [here](https://53js.github.io/react-jsonschema-form-validation "documentation")

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

## Licence

MIT

## About us

📬 contact : contact@53js.fr

follow us : [@53jsdev](https://twitter.com/53jsdev "https://twitter.com/53jsdev")

github repos : [/53js](https://github.com/53js "https://github.com/53js")

🚀 website : [53js.fr](https://53js.fr "https://www.53js.fr")
