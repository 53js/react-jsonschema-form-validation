# RFC 0001 — DOM-first form API (v1.0 architecture)

- **Status**: Draft — for discussion
- **Date**: 2026-07-29
- **Related**: issue [#57](https://github.com/53js/react-jsonschema-form-validation/issues/57) (audit), PR [#55](https://github.com/53js/react-jsonschema-form-validation/pull/55) (non-DOM components), issue [#6](https://github.com/53js/react-jsonschema-form-validation/issues/6) (error message values)

## Summary

Redesign the library around three pillars:

1. **`useForm`** — a hook that owns form state and validation, making them accessible in the component that renders the `<Form>` (impossible today: the context is created *by* `<Form>`).
2. **Pluggable validation** — a small validator spec based on [Standard Schema](https://standardschema.dev), so JSON Schema (AJV, default), Zod, Valibot, ArkType, etc. all work without per-library adapters.
3. **DOM-first** — lean on the HTML spec wherever the platform already solves the problem: `form` attribute association by id, the Constraint Validation API (`setCustomValidity`, `ValidityState`, `:user-invalid`), and an imperative API named after `HTMLFormElement`.

The current API remains available as sugar. Getting started stays 5 lines.

## Motivation

Today's limitations (see #57 for the full audit):

- **The form's state is unreachable where it is needed most.** `valid`, `errors`, `reset` only exist inside the `<Form>` subtree via context. `<button disabled={!valid}>` next to the `<Form>` call site requires extracting a child component.
- **Hard coupling to AJV 6** (EOL). Consumers using Zod/Valibot cannot use the library; consumers with AJV 8 in their tree bundle two AJVs.
- **The library reimplements what HTML provides**: touched/invalid classnames instead of `:user-invalid`, `scrollToError` instead of focus management, custom association instead of the native `form` attribute — and gets none of the free accessibility the platform ships.

## Design principles

1. **DOM-first, JavaScript as enhancement.** If the HTML spec covers it, use it; the JS layer exists for what the platform cannot do (styled error messages, non-DOM components, nested data).
2. **Simplicity is the product.** The minimal example must not grow. Power features are opt-in (`useForm`), never required.
3. **Controlled data.** The parent owns `data`; the library validates and reports. (Unchanged from today.)
4. **Fail loudly.** No silent de-association, no silently dropped values (cf. the bug fixed in #55).
5. **Typed end-to-end.** The `form` object carries the type of `data`; string-based indirection is avoided.

## Architecture

### `useForm`

```ts
const form = useForm<CheckoutData>({
	schema,              // Standard Schema object, or JSON Schema (wrapped by the default AJV adapter)
	data,                // controlled value, owned by the parent
	onChange: setData,   // (data: T, event?) => void
	// ajv, errorMessages, throttleDuration… carried over
});
```

`useForm` returns a referentially stable `FormApi<T>`:

```ts
interface FormApi<T> {
	// Reactive state (subscription-backed — see “Subscription model”)
	valid: boolean;
	errors: FormError[];
	touchedFields: string[];
	isSubmitted: boolean;

	// Identity
	id: string;                    // auto-generated (React useId) — see “ids”

	// Imperative API — named after HTMLFormElement
	reset(): void;
	checkValidity(): boolean;      // validate now, no UI side effect
	reportValidity(): boolean;     // validate + focus first invalid field
	requestSubmit(): void;

	// Field-level helpers (today’s context API, carried over)
	getFieldErrors(name: string | string[]): FormError[];
	isFieldInvalid(name: string | string[]): boolean;
	isFieldTouched(name: string | string[]): boolean;
	touch(name: string | string[]): void;
	handleFieldChange(eventOrName, value?): void;
}
```

**The state lives in the hook, not in the component.** `<Form>` becomes a thin binder: context provider + `<form>` element + DOM wiring. This is what makes the parent-access problem disappear structurally, and what the DOM projection and multi-form aggregation build on.

### `<Form>` — two modes

```tsx
// Sugar mode — unchanged from today; <Form> calls useForm internally
<Form schema={schema} data={data} onChange={setData} onSubmit={save}>

// Hook mode — when the parent needs valid/errors/reset
const form = useForm({ schema, data, onChange: setData });
<Form form={form} onSubmit={save}>
	<button disabled={!form.valid}>Save</button>
</Form>
```

The two modes are **mutually exclusive at the type level** (discriminated union):

```ts
type FormProps<T, C> =
	| { form: FormApi<T> } & PresentationProps<C>          // hook mode
	| FormBaseProps<T> & PresentationProps<C>;             // sugar mode (schema, data, onChange…)
```

Passing both `form` and `schema` is a compile error, not a precedence rule. Internally `<Form>` always calls `useForm` (hooks cannot be conditional) and ignores the internal instance when `form` is supplied.

### Field association — HTML semantics

Association follows the HTML spec for form-associated elements:

1. **Default: nearest `<Form>` ancestor** (React context — today's behavior, zero friction, nothing to repeat on each `<Field>`).
2. **Override: the `form` prop**, only when the field lives outside the form's subtree or must target another form — the React equivalent of HTML's `form=""` content attribute. Explicit prop wins over ancestor.
3. **Neither → throw.** Deliberate divergence from HTML, which silently de-associates on an unknown id. Silent failure is the class of bug #55 fixed; we fail loudly.

The `form` prop takes the **`FormApi` object** (not a string id) — it carries the store and the `data` type. When the underlying component is a native DOM element, `<Field>` additionally sets the **native `form={form.id}` attribute** on it, so the React association (context, onChange, classnames) and the DOM association (`form.elements`, Enter-to-submit, constraint validation) always designate the same form with a single prop. For non-DOM components only the React layer applies.

Nested `<Form>`s (invalid HTML, possible in React): nearest wins — standard context semantics, no special case.

### ids

- Auto-generated by `useForm` via `useId()` (SSR-safe, collision-free). No naming discipline, no duplicate handling, no typos.
- The id is plumbing, not API: it feeds the native `form` attribute, and deterministic DOM ids for accessibility — `` `${form.id}-${name}-error` `` on `<FieldError>`, referenced by `aria-describedby` on the field.
- Escape hatch: `useForm({ id: 'checkout' })` for consumers who want a well-known id (e.g. a hand-written `<button form="checkout">`). Not the nominal path.
- **No global registry.** An earlier design iteration had a `FormsProvider` registry keyed by form id. Dropped: the DOM *is* the registry for native association, and passing the typed `form` object covers the React side with better DX (see “Rejected alternatives”).

### Validator spec — Standard Schema

`useForm` accepts any object implementing [Standard Schema v1](https://standardschema.dev) (`~standard.validate()`), which Zod (≥3.24), Valibot, ArkType and Effect Schema already implement. AJV does not, so the library ships a wrapper:

```ts
import { ajvSchema } from 'react-jsonschema-form-validation/ajv';  // subpath export — Zod users don't bundle AJV

const form = useForm({ schema: ajvSchema(jsonSchema, { ajv }) });
// Sugar: a plain JSON Schema object passed to `schema` is wrapped automatically.
```

Errors are normalized to the shape the rest of the library already speaks:

```ts
interface FormError {
	field: string;    // dot-path: 'user.email', 'items.0.label' — the existing internal lingua franca
	code: string;     // normalized code (below), or the provider’s own when unmapped
	message: string;  // provider default message (Zod carries these in-schema; AJV generates them)
	raw?: unknown;    // original provider error — escape hatch
}
```

**Normalized code core** (adapters map into it; unmapped codes pass through as-is):
`required`, `type`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `format`, `enum`. The `errorMessages` maps (Form-level and FieldError-level) are keyed by these codes, making custom messages portable across providers. `raw` preserves provider-specific detail (fixes #6's underlying need: adapters can expose the offending value in `raw`/`params`).

**Sync-only in v1.** Standard Schema allows `validate()` to return a Promise (async refinements). The library validates on every change; async would require stale-result handling. v1 throws an explicit error when a Promise comes back; async support is a possible v1.x follow-up.

### Constraint Validation projection

After each validation, an effect projects errors into the native constraint validation system: walk `form.elements`, match by `name` against `FormError.field`, and call `setCustomValidity(message)` (empty string to clear).

What this buys, for free:

- **`:user-invalid` / `:user-valid`** — the platform's native "touched + invalid" concept. The library's `isTouched`/`isInvalid` classnames become a compatibility layer (kept for non-DOM components and older browsers), not the mechanism.
- `input.validationMessage`, `ValidityState`, `invalid` events — standard integration points for third-party tooling.
- `reportValidity()` focuses the first invalid control and announces it to assistive tech — replacing `scrollToError`'s job with better a11y.

Nuances, handled deliberately:

- `<form noValidate>` is **kept**: it suppresses the unstylable native bubbles and submit-blocking, while `ValidityState` and pseudo-classes still reflect `setCustomValidity`. Styled messages remain `<FieldError>`'s job.
- Native `reportValidity()` always shows a bubble. The library's `reportValidity()` therefore implements "validate + focus first invalid + announce" manually (focus + `aria-describedby` already links the message) rather than delegating blindly.
- **Non-DOM components** (react-select & co, cf. #55) have no `HTMLInputElement` and cannot participate. They are served by the React layer only (context/classnames/FieldError). This hybrid boundary is documented, not hidden.

### Accessibility (from #57 §1)

Folded into this architecture rather than bolted on:

- `<FieldError>`: `role="alert"` (or `aria-live="polite"`), deterministic id derived from `form.id` + `name`.
- `<Field>`: `aria-invalid` when invalid, `aria-describedby` → the FieldError id.
- Focus management on failed submit via `reportValidity()` semantics (focus, not just scroll).

### Subscription model

Each `FormApi` wraps a self-contained store (`subscribe`/`getSnapshot`), consumed via `useSyncExternalStore` — native in React 18, official shim (`use-sync-external-store`) for 16.8+. Consumers subscribe per-form, optionally per-selector (a `FieldError` for `email` re-renders only when `email`'s errors change) — a performance *improvement* over today, where every context consumer re-renders on any form state change.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| **Ref-based wiring** (`<Form ref={form.ref}>`, Form owns state, hook observes) | Refs are not reactive → requires a subscription bridge with a one-render gap at mount (worse under StrictMode); splits the API surface (config on the component, reads on the hook); collides with users' expectation that `ref` yields the DOM element; kills type inference (`useForm` never sees `data`). The valid instinct behind it — "the library should touch the real DOM form" — survives as the internal DOM ref + Constraint Validation projection. |
| **Global registry keyed by string ids** (`<FormsProvider>`, `useFormState('checkout')`) | redux-form's historical failure mode; string coupling defeats typing; SSR-singleton hazards; and the DOM's native `form` attribute already provides cross-tree association for the cases that matter. Passing the `FormApi` object covers the rest, typed. |
| **Registry stores form state centrally** | Every keystroke through a global store → cross-form re-renders. Each form stays its own store. |

## Migration plan

### 0.6.x / 0.7 — independent of this RFC

(tracked in #57; listed here only for sequencing)

1. Merge the open train: #54 (CI) → #55 (non-DOM fix) → #56 (CHANGELOG).
2. Quick wins: helper bugs, `peerDependencies: react >=16.8` (the code already requires it — `createContext`/`useContext`), a11y attributes on `Field`/`FieldError`.
3. **Type and document the imperative ref on the current class `Form`** (`formRef.current.reset()` already works at runtime; the export cast hides it). Names aligned on `HTMLFormElement` (`reset`, `checkValidity`) so they carry over to v1 unchanged. Covers the "reset after server submit" need (#57 §5) without waiting for the rewrite.
4. Optional stopgap: render-prop `children` (`<Form>{(form) => …}</Form>`) — cheap, non-breaking. Skip if v1 lands quickly.

### 1.0 — this RFC

- `useForm` + store; `<Form>` rewritten as function component binding the store (sugar mode preserves today's surface).
- Standard Schema spec + `ajv` subpath adapter; **AJV 6 → 8** rides along (`dataPath` → `instancePath` is absorbed by the adapter).
- Constraint Validation projection + a11y wiring.
- Tooling prerequisites from #57 §4 (Vite/Vitest/RTL) land before or with this — Enzyme cannot test hooks-era components across React versions.

**Breaking changes budget (1.0):** peer `react >=16.8` (or 18 if we drop the shim), AJV 8 (via adapter — custom `ajv` instances must be v8), `errorMessages` keys move from AJV keywords to normalized codes (a mapping table ships in the migration guide), classnames kept but documented as legacy in favor of `:user-invalid`.

## Out of scope

- Field arrays helpers, `register`-style APIs, wizard/multi-step state persistence — the differentiator stays *simplicity, JSON-Schema-first, platform-leaning*; we do not chase react-hook-form's surface.
- Async validation (explicit error in v1, possible v1.x).
- Uncontrolled mode (`defaultData` owned by the hook) — the door stays open, controlled-first.
- Multi-argument change handlers for non-DOM components (documented limitation of #55).

## Open questions

1. Exact contents of the normalized error-code core (proposal above) — validate against real AJV + Zod error tables during the POC.
2. Package identity: the name says `jsonschema` while v1 is provider-agnostic. Options: keep the name (JSON Schema remains the default battery), or publish under a scope later with the current name as an alias. No decision needed for the POC.
3. Keep generating `Jfv_*`/state classnames forever, or deprecate towards CSS pseudo-classes at 2.0?
4. Minimum React: 16.8 + shim vs 18 native (`useId` also requires 18 — auto-id needs a fallback if we keep 16.8).

## Suggested next step

POC on a branch: `useForm` (controlled, sync) + AJV Standard Schema wrapper + `<Form>` dual-mode, validating the store/subscription design and the normalized `FormError` shape against the existing test suite. The Constraint Validation projection can be a second commit on the same branch.
