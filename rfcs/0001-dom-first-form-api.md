# RFC 0001 — DOM-first form API (v1.0 architecture)

- **Status**: Draft — revised after first review round
- **Date**: 2026-08-07 (first draft 2026-07-29)
- **Related**: issue [#57](https://github.com/53js/react-jsonschema-form-validation/issues/57) (audit), PR [#55](https://github.com/53js/react-jsonschema-form-validation/pull/55) (non-DOM components), issue [#6](https://github.com/53js/react-jsonschema-form-validation/issues/6) (error message values)

## Summary

Redesign the library around three pillars:

1. **`useForm`** — a hook that owns form state and validation, making them accessible in the component that renders the `<Form>` (impossible today: the context is created *by* `<Form>`).
2. **Pluggable validation** — a small validator spec based on [Standard Schema](https://standardschema.dev), so JSON Schema (AJV, default), Zod, Valibot, ArkType, etc. all work without per-library adapters.
3. **DOM-first** — lean on the HTML spec wherever the platform already solves the problem: `form` attribute association by id, deterministic ids for ARIA wiring, focus management on failed submit, and an imperative API named after `HTMLFormElement`. The Constraint Validation projection initially attached to this pillar is deferred to an opt-in v1.x layer (see below).

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
// Validation config — declared in useForm (hook mode) or on <Form> (sugar mode)
type FormConfigProps<T> = {
	schema: …; data?: T; onChange?: …; ajv?: …; errorMessages?: …; throttleDuration?: number;
};
// Shared by both modes: submit + presentation
type FormSharedProps<C> = {
	onSubmit: …; scrollToError?: boolean; scrollOptions?: …;
} & PresentationProps<C>;

type FormProps<T, C> =
	| ({ form: FormApi<T> } & { [K in keyof FormConfigProps<T>]?: never } & FormSharedProps<C>)  // hook mode
	| ({ form?: never } & FormConfigProps<T> & FormSharedProps<C>);                              // sugar mode
```

Passing both `form` and `schema` is a compile error, not a precedence rule. A plain union of intersections would **not** deliver that error (TypeScript narrows such unions poorly); the explicit `never` markers on each branch's foreign props are what make the mixed usage fail. Only the *validation-config* props are masked in hook mode — masking all of the base props would also forbid `onSubmit`/`children`/presentation props that hook mode still needs (caught in review). Internally `<Form>` always calls `useForm` (hooks cannot be conditional) and ignores the internal instance when `form` is supplied.

### Field association — HTML semantics

Association follows the HTML spec for form-associated elements:

1. **Default: nearest `<Form>` ancestor** (React context — today's behavior, zero friction, nothing to repeat on each `<Field>`).
2. **Override: the `form` prop**, only when the field lives outside the form's subtree or must target another form — the React equivalent of HTML's `form=""` content attribute. Explicit prop wins over ancestor.
3. **Neither → throw.** Deliberate divergence from HTML, which silently de-associates on an unknown id. Silent failure is the class of bug #55 fixed; we fail loudly.

The `form` prop takes the **`FormApi` object** (not a string id) — it carries the store and the `data` type. When the underlying component is a native DOM element, `<Field>` sets the **native `form={form.id}` attribute** on it (it always does — see “ids”), so the React association (context, onChange, classnames) and the DOM association (`form.elements`, Enter-to-submit) always designate the same form with a single prop. For non-DOM components only the React layer applies.

Naming note: the prop deliberately shadows the native `form` content attribute in `<Field>`'s prop types. This is safe because the string attribute is library-managed — derived from `form.id`, never user-supplied. Accepting `FormApi | string` was considered and rejected: a hand-written string could make the DOM association diverge from the React one, the exact misalignment this design removes.

Nested `<Form>`s (invalid HTML, possible in React): nearest wins — standard context semantics, no special case.

### ids

- **The effective id lives on the `FormApi`**: auto-generated by `useForm` via `useId()` (SSR-safe, collision-free), or supplied by the developer — `useForm({ id: 'checkout' })` in hook mode (e.g. for a hand-written `<button form="checkout">`), the `id` prop of `<Form>` in sugar mode (it feeds the internal `useForm`). Single source of truth: in hook mode, a conflicting `id` prop on `<Form form={form}>` is a dev-time error.
- `<Form>` renders `id={form.id}` on the `<form>` element and **exposes the effective id through the context**; descendants derive their DOM ids from it — `` `${form.id}-${name}-error` `` on `<FieldError>`, referenced by `aria-describedby`. This generalizes the mechanism shipped in #65 (form-level id exposed via context + a form-scoped registry mapping field names to the `<FieldError>` ids); v1 keeps that registration pattern and replaces #65's module counter with `useId`.
- **The native `form` attribute is library-managed, never a user prop.** `<Field>` always sets `form={form.id}` on native form controls: redundant when the control already sits inside the `<form>` element, and exactly what preserves native association (Enter-to-submit, `form.elements`) when the field renders through a portal (modal, drawer) or is associated from outside via the `form` prop.
- **No cross-form registry.** An earlier design iteration had a `FormsProvider` registry keyed by form id. Dropped: the DOM *is* the registry for native association, and passing the typed `form` object covers the React side with better DX (see “Rejected alternatives”). Not to be confused with #65's registry, which is *form-scoped* — it wires field names to `<FieldError>` DOM ids inside a single form for ARIA purposes, orthogonal to the rejected *cross-form* lookup.

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

**Known-unmapped set** (a documented boundary, not an oversight): `oneOf`/`anyOf`, `multipleOf`, `uniqueItems`, `minItems`/`maxItems`, `const`, `additionalProperties` keep the provider's own code, with full detail in `raw`. `minItems`/`maxItems` are the first promotion candidates if array-heavy schemas prove common. For AJV users the `errorMessages` key migration is small: normalized codes reuse AJV keyword names — effectively only `minimum`/`maximum` → `min`/`max` change.

**Sync-only in v1.** Standard Schema allows `validate()` to return a Promise (async refinements). The library validates on every change; async would require stale-result handling. v1 throws an explicit error when a Promise comes back; async support is a possible v1.x follow-up.

### Constraint Validation projection — deferred to v1.x (opt-in)

*Moved out of the 1.0 scope after the first review round (PR #58 discussion).*

The idea: after each validation, an effect projects errors into the native constraint validation system — walk `form.elements`, match by `name` against `FormError.field`, call `setCustomValidity(message)` (empty string to clear). Payoff: `:user-invalid` / `:user-valid` styling in pure CSS on native inputs, plus `ValidityState` / `invalid`-event interop for third-party tooling.

Why deferred: the classname/context path must exist regardless (non-DOM components cannot participate — no `HTMLInputElement`), so the projection is a second, parallel source of validity truth to keep in sync: name-matching edge cases (radio groups, nested paths with no matching control), `noValidate` coordination, a doubled CSS contract, doubled tests. Meanwhile its concrete UX wins — focus + announce on failed submit — already shipped independently (#59, #61, #65). What remains is pure-CSS styling and `ValidityState` interop: real, but not load-bearing for 1.0.

What 1.0 commits to nonetheless:

- **Design constraint on the store**: the projection must be implementable as a *pure subscriber* — an effect consuming `form.errors` and the form's DOM ref, touching no core code. The store API is shaped so the v1.x layer plugs in from the outside (possibly as a subpath export).
- **Versioning rule**: classnames remain the supported mechanism (see resolved questions). As long as they stay, the projection is purely additive and ships in a **minor** (1.x). Removing the classnames in favor of pseudo-classes would be a breaking change — a 2.0-scale discussion, not implied by this RFC.

Notes kept for the future layer: `<form noValidate>` stays (suppresses the unstylable native bubbles while `ValidityState` and pseudo-classes still reflect `setCustomValidity`); native `reportValidity()` always shows a bubble, so the library's `reportValidity()` keeps implementing focus + announce manually.

### Accessibility (from #57 §1)

Largely shipped in 0.7 (#59, #61, #65); v1 keeps the same contract and derives the ids from `form.id`:

- `<FieldError>`: `role="alert"` (or `aria-live="polite"`), deterministic id derived from `form.id` + `name`.
- `<Field>`: `aria-invalid` when invalid, `aria-describedby` → the FieldError id.
- Focus management on failed submit via `reportValidity()` semantics (focus, not just scroll).

### Subscription model

Each `FormApi` wraps a self-contained store (`subscribe`/`getSnapshot`), consumed via `useSyncExternalStore` (React 18 — see resolved questions). Per-selector granularity (a `FieldError` for `email` re-renders only when `email`'s errors change) requires `useSyncExternalStoreWithSelector` (from `use-sync-external-store/with-selector`, which React itself depends on) — plain `useSyncExternalStore` re-renders on every snapshot change and would forfeit the win. Either way, an *improvement* over today, where every context consumer re-renders on any form state change.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| **Ref-based wiring** (`<Form ref={form.ref}>`, Form owns state, hook observes) | Refs are not reactive → requires a subscription bridge with a one-render gap at mount (worse under StrictMode); splits the API surface (config on the component, reads on the hook); collides with users' expectation that `ref` yields the DOM element; kills type inference (`useForm` never sees `data`). The valid instinct behind it — "the library should touch the real DOM form" — survives as the internal DOM ref (and the deferred Constraint Validation projection). |
| **Global registry keyed by string ids** (`<FormsProvider>`, `useFormState('checkout')`) | redux-form's historical failure mode; string coupling defeats typing; SSR-singleton hazards; and the DOM's native `form` attribute already provides cross-tree association for the cases that matter. Passing the `FormApi` object covers the rest, typed. |
| **Registry stores form state centrally** | Every keystroke through a global store → cross-form re-renders. Each form stays its own store. |

## Migration plan

### 0.6.x / 0.7 — shipped (status 2026-08-07)

Tracked in #57; mostly done:

1. ~~Open train~~ — #54 (CI), #55 (non-DOM fix), #56 (CHANGELOG) merged.
2. ~~Quick wins~~ — helper bugs (#60), `isFieldInvalid` multi-name + scroll guard/focus (#61), `peerDependencies: react >=16.8` + `role="alert"` (#59), `aria-invalid`/`aria-describedby` wiring (#65, in flight), runtime deps dropped: `scroll-to-element`, `lodash.throttle` (#66), `SECURITY.md`/`CONTRIBUTING.md` (#64).
3. Still open from the original list: **type and document the imperative ref on the current class `Form`** (`formRef.current.reset()` already works at runtime; the export cast hides it). Names aligned on `HTMLFormElement` (`reset`, `checkValidity`) so they carry over to v1 unchanged. Covers the "reset after server submit" need (#57 §5) without waiting for the rewrite.
4. Render-prop stopgap: **dropped** — v1 is close enough.

### 1.0 — this RFC

- `useForm` + store; `<Form>` rewritten as function component binding the store (sugar mode preserves today's surface).
- Standard Schema spec + `ajv` subpath adapter; **AJV 6 → 8** rides along (`dataPath` → `instancePath` is absorbed by the adapter).
- ARIA wiring generalized from #65 (ids derived from `form.id`); Constraint Validation projection explicitly **out** (v1.x opt-in, see above).
- Tooling prerequisites from #57 §4 (Vite/Vitest/RTL) land before or with this — Enzyme cannot test hooks-era components across React versions.

**Breaking changes budget (1.0):** peer `react >=18`, AJV 8 (via adapter — custom `ajv` instances must be v8), `errorMessages` keys move from AJV keywords to normalized codes (small for AJV users — effectively `minimum`/`maximum` → `min`/`max`; the mapping table ships regardless). Classnames are **not** deprecated. A **single migration guide** covers 0.x → 1.0, folding in the breaks already shipped in 0.7 (#59 peerDep, #60 error-path normalization).

## Out of scope

- Field arrays helpers, `register`-style APIs, wizard/multi-step state persistence — the differentiator stays *simplicity, JSON-Schema-first, platform-leaning*; we do not chase react-hook-form's surface.
- Async validation (explicit error in v1, possible v1.x).
- Constraint Validation projection (deferred to a v1.x opt-in layer — see its section for the versioning rule).
- Uncontrolled mode (`defaultData` owned by the hook) — the door stays open, controlled-first.
- Multi-argument change handlers for non-DOM components (documented limitation of #55).

## Resolved questions (first review round, PR #58)

- **Error-code core**: ship the 9 as proposed; the known-unmapped set is documented above. Only remaining open point: validate the core against real AJV + Zod error tables during the POC.
- **Package identity**: keep `react-jsonschema-form-validation` for 1.0 (JSON Schema stays the default battery); revisit at 2.0 only if non-JSON-Schema usage dominates.
- **Classnames**: they stay *the* mechanism, not legacy. Pseudo-classes are not settable from JS and do not exist for non-DOM components, so `:user-invalid` can only ever be additive (via the deferred projection), never a replacement. Removing classnames would be a 2.0-scale break.
- **Minimum React: 18, no shims.** `useId` has no shim — supporting 16.8 would mean re-implementing id generation with the collision risks `useId` exists to solve. React 16/17 remain served by the 0.x line.

## Suggested next step

POC on a branch: `useForm` (controlled, sync) + AJV Standard Schema wrapper + `<Form>` dual-mode, validating the store/subscription design and the normalized `FormError` shape against the existing test suite. The POC also proves the pure-subscriber constraint: a throwaway sketch of the Constraint Validation effect built entirely outside the core (not for merge).
