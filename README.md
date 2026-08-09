# React JSON Schema Form Validation

[![npm](https://img.shields.io/npm/v/react-jsonschema-form-validation.svg?style=flat)](https://npmjs.org/package/react-jsonschema-form-validation "View this project on npm")
[![CI](https://github.com/53js/react-jsonschema-form-validation/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/53js/react-jsonschema-form-validation/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)

Validate forms with powerful JSON Schema and Ajv !

This library links JSON Schema, Ajv and Form to :
- describe data model with JSON Schema
- validate the form data with Ajv
- display & customize error messages
- use your own graphical components to build friendly user forms.

## Why RJFV ?
- Simplicity (no extraneous features, just what you need)
- Performance (AJV is extremely fast _:zap:_)
- Actively maintained
- The simplest react JSON Schema validation module ever published on npm ! :v:

Other JSON Schema validation modules published on NPM are often complex, with too much features.
That's why we created react-jsonschema-form-validation. 
You'll just need a schema, a form, some fields, and your data. Nothing more. <i class="fa fa-arrow-right"></i> it's S I M P L E

Our philosophy :
- focused on validation, not UI    
- highly customizable
- minimal CSS (15 lines) : just a red color to show error message (can be overriden)

## Installation

```bash
npm install react-jsonschema-form-validation
```

```bash
yarn add react-jsonschema-form-validation
```

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
import React, { useState } from 'react';
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
Pass your schema to the Form props.

**Example using a functional component and React hooks:**   
```jsx
const DemoForm = (props) => {
	const [formData, setFormData] = useState({ email: '' });
	
	const handleChange = (newData) => {
		// newData is a copy of the object formData with properties (and nested properties)
		// updated using immutability pattern for each change occured in the form.
		setFormData(newData);
	}
	
	const handleSubmit = () => {
		const { doWhateverYouWant } = props;
		doWhateverYouWant(formData); // Do whatever you want with the form data
	}

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
}
```

**Same example using a class component:**  
```jsx
class DemoForm extends PureComponent {
	state = {
		formData: {
			email: '',
		},
	}
	
	handleChange = (newData) => {
		// newData is a copy of the object formData with properties (and nested properties)
		// updated using immutability pattern for each change occured in the form.
		this.setState({ formData: newData });
	}
	
	handleSubmit = () => {
		const { doWhateverYouWant } = this.props;
		const { formData } = this.state;
		doWhateverYouWant(formData); // Do whatever you want with the form data
	}

	render() {
		<Form
			data={this.state.formData}
			onChange={this.handleChange}
			onSubmit={this.handleSubmit}
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
	}
}
```

🎵 _That's all folks !_ 

## Custom error messages

Pass an `errorMessages` map (keyword → function) to `<Form>` — or to a
single `<FieldError>` — to replace AJV's raw messages. Each function
receives the AJV error, which carries the current value of the offending
field as `error.data`, so messages can quote what the user actually typed:

```jsx
<Form
	data={formData}
	errorMessages={{
		minLength: (e) => `"${e.data}" is too short (min ${e.params.limit} characters)`,
		format: (e) => `"${e.data}" is not a valid ${e.params.format}`,
		required: () => 'This field is required',
	}}
	onChange={handleChange}
	onSubmit={handleSubmit}
	schema={demoSchema}
>
	<Field name="email" value={formData.email} />
	<FieldError name="email" />
	<button type="submit">Submit</button>
</Form>
```

What `error.data` contains, per error type:

- value-level keywords (`minLength`, `format`, `enum`, `const`, `pattern`,
  `minimum`, … including `$data` references): the current value of the field;
- `required`: the **parent object** missing the property (AJV reports
  `required` on the parent — the missing value itself does not exist).
  Use `e.params.missingProperty` for the field name.

Errors also expose `error.schema` (the failing keyword's value, e.g. `5`
for `minLength: 5`) and `error.parentSchema` (the enclosing subschema).

> **Serialization & logging** — with `verbose`, a `required` error carries
> the *entire parent object* in `error.data`. A `JSON.stringify(errors)`
> shipped to monitoring or logs can therefore exfiltrate sensitive sibling
> fields (a password living next to the missing property, for instance),
> and cyclic data would make `stringify` throw. Log a projection of chosen
> fields (`field`, `keyword`, `message`) rather than raw error objects.

> **Note** — these properties come from AJV's `verbose` option, enabled on
> the default instance. If you pass your own instance through the `ajv`
> prop of `<Form>`, set `verbose: true` yourself to benefit from
> `error.data`.

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
  `id` in the parent `<Form>`, and the matching `<Field>` references those ids
  once the field is revealed. The default id is deterministic —
  `jfv<N>-error-<name>`, where `jfv<N>` identifies the `<Form>` instance so
  two forms on the same page never collide. A custom `id` prop on
  `<FieldError>` is followed automatically.
- An `aria-describedby` you pass to `<Field>` yourself is **merged**, not
  replaced: your ids come first (e.g. a hint text), the error ids after.
- On a failed submit, keyboard focus moves to the first invalid field
  (disable with `scrollToError={false}` on `<Form>`).

```jsx
<span id="email-hint">We never share your email.</span>
<Field name="email" aria-describedby="email-hint" value={formData.email} />
<FieldError name="email" />
{/* Once the field is touched (or the form submitted) and invalid,
    the input renders:
    aria-invalid="true" aria-describedby="email-hint jfv1-error-email" */}
```

The default error id can be computed with the exported helper (`formId` is
available on the form context, see [useFormContext](#reading-the-form-state-useformcontext)):

```js
import { getFieldErrorId } from 'react-jsonschema-form-validation';

getFieldErrorId('jfv1', 'email'); // 'jfv1-error-email'
```

Known limitations:

- Rendering several `<FieldError>` with the same `name` in one form produces
  duplicate default ids (invalid HTML). Override `id` on all but one of them.
- A `name` containing spaces cannot be referenced through the generated
  `aria-describedby` (it is a space-separated id list). Give such a
  `<FieldError>` a custom `id`.

## Reading the form state: useFormContext

Everything `<Form>` knows is available to its descendants through the
`useFormContext()` hook (a legacy render-prop helper, `withFormContext(cb)`,
also exists). Both throw a descriptive error when used outside a `<Form>`.

```js
import { useFormContext } from 'react-jsonschema-form-validation';
```

Main context values:

| Name | Description |
| --- | --- |
| `errors` | Current validation errors (`FormattedError[]`, each with a normalized `field` path) |
| `valid` | `true` when the data matches the schema. Validation is throttled (200 ms by default, `throttleDuration` prop on `<Form>`), so `valid` can lag one beat behind the latest change |
| `isSubmitted` | `true` once a submit has been attempted (reset after a successful submit, unless `resetOnSubmit={false}`) |
| `touchedFields` | Names of the fields that have been blurred |
| `reset()` | Resets `errors`, `touchedFields` and `isSubmitted` to their initial state (called automatically after a successful submit unless `resetOnSubmit={false}`) |
| `getFieldErrors(names)` | Errors for one or several field paths (wildcards like `emails.*` work) |
| `isFieldInvalid(names)` | `true` if any of the given fields has an error |
| `isFieldTouched(names)` | `true` if any of the given fields was touched |
| `isTouched()` | `true` if at least one field was touched |
| `touch(names)` | Marks fields as touched |
| `handleFieldChange(event)` or `handleFieldChange(name, value)` | Applies a change programmatically |
| `formId` | Unique id of the `<Form>` instance (see [Accessibility](#accessibility)) |
| `errorMessages` | The `errorMessages` map passed to `<Form>`, if any |

(The remaining values — `fieldErrorsVersion`, `getFieldErrorDescribedBy`,
`registerFieldError`, `unregisterFieldError` — are internal wiring between
`<Field>` and `<FieldError>`.)

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
				<li key={`${error.field}-${error.keyword}`}>
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

## TypeScript

The library is fully typed — `.d.ts` declarations ship with the package, no
`@types/...` required.

Most relevant exported types:

```ts
import type {
    FormProps,         // generic: FormProps<T, C> — T = data shape, C = wrapper element
    FieldProps,        // generic: FieldProps<C> — C = underlying component
    FieldErrorProps,   // generic: FieldErrorProps<C>
    FormContextValue,
    FormattedError,
    ErrorMessageFn,
    ErrorMessagesMap,
} from 'react-jsonschema-form-validation';
```

## Migrating to v1 (AJV 8)

Version 1.0 upgrades the bundled validator from AJV 6 to
[AJV 8](https://ajv.js.org/v6-to-v8-migration.html). If you only pass
`schema`/`data` and read errors through `<FieldError>`, no code change is
required. Otherwise:

- **`errors[].dataPath` → `errors[].instancePath`** — AJV 8 errors carry a
  JSON Pointer `instancePath` (`/user/email`) instead of the dot-notation
  `dataPath` (`.user.email`). The normalized `field` property added by the
  library (`user.email`) is unchanged — code reading `error.field` keeps
  working as-is. Code reading the raw `error.dataPath` must switch to
  `error.instancePath`.
- **Error message wording changed** — AJV 8 says `must be ...` where AJV 6
  said `should be ...` (e.g. `must have required property 'email'`). If you
  match on default AJV messages (tests, custom logic), update the wording —
  or rather map messages by `error.keyword` via the `errorMessages` prop,
  which is immune to wording changes.
- **String formats now come from `ajv-formats`** — AJV 8 removed built-in
  formats (`email`, `date`, `uri`…). The default instance restores them via
  [`ajv-formats`](https://github.com/ajv-validator/ajv-formats) (a
  dependency of this library), in its default `full` validation mode, which
  is stricter than AJV 6's on some edge values. If you pass a custom `ajv`
  instance and rely on formats, call `addFormats(ajv)` yourself.
- **The default instance keeps AJV 6's permissive behavior** — it is created
  with `new Ajv({ allErrors: true, $data: true, strict: false })`:
  schemas containing unknown keywords still compile instead of throwing.
  Note that this loses one AJV 6 safety net: AJV 6 threw at compile time on
  an unknown format name (a typo like `format: 'emial'` crashed
  immediately), while AJV 8 with `strict: false` only logs a warning and
  ignores the format — every value then passes silently, so double-check
  your format names (or use a strict instance, below).
  To opt into AJV 8 strict mode — or another JSON Schema draft — pass your
  own instance through the `ajv` prop. Any object exposing a
  `compile(schema)` function is accepted (`Ajv`, `Ajv2019`, `Ajv2020`…):

  ```js
  import Ajv2020 from 'ajv/dist/2020';
  import addFormats from 'ajv-formats';

  const ajv = new Ajv2020({ allErrors: true, $data: true }); // strict by default
  addFormats(ajv);

  <Form ajv={ajv} schema={schema} data={data} onSubmit={handleSubmit} />
  ```

- **Custom AJV 6 instances still work for now** — the library still
  understands `dataPath`-shaped errors, so an injected AJV 6 instance keeps
  functioning during the transition. This fallback is deprecated and will be
  removed in the final 1.0.

## Known limitations

- Property names containing a dot (`.`) or a slash (`/`) are not supported
  in field `name`s: the library addresses fields with dot-separated paths
  (`user.email`), so such keys cannot be addressed unambiguously.

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
