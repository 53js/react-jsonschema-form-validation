/**
 * Negative type tests — usages that MUST NOT compile.
 *
 * Each block is preceded by `// @ts-expect-error`. If TypeScript stops
 * flagging the underlying error (e.g. a public typing regression makes it
 * legal), the directive becomes "unused" and CI fails with an explicit
 * error. This gives us a two-way safety net: positive tests ensure valid
 * usage works, negative tests ensure invalid usage is rejected.
 */
import React, { useRef } from 'react';
import Form, { Field, FieldError } from 'react-jsonschema-form-validation';

type UserData = { email: string; age: number };
const schema = { type: 'object' as const };

type MyInputProps = { label: string; flavor: 'sweet' | 'savory' };
const MyInput = (p: MyInputProps) => <input data-flavor={p.flavor} />;

// Reactstrap-like: typed keys + `[key: string]: any` index signature
type LooseInputProps = {
	cssModule?: { className: string };
	bsSize?: 'sm' | 'lg';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
};
const LooseInput = (_p: LooseInputProps) => <input />;

// ---------------------------------------------------------------------------
// Field — required prop and prop-type checks
// ---------------------------------------------------------------------------

// @ts-expect-error — name is required
const f1 = <Field />;

// @ts-expect-error — name must be string
const f2 = <Field name={42} />;

// @ts-expect-error — 'textarea' has no `href` prop
const f3 = <Field name="a" component="textarea" href="/x" />;

// ---------------------------------------------------------------------------
// Field with custom component — inference must be strict
// ---------------------------------------------------------------------------

// @ts-expect-error — flavor must be 'sweet' | 'savory'
const f4 = <Field name="a" component={MyInput} label="l" flavor="WRONG" />;

// @ts-expect-error — required `label` missing
const f5 = <Field name="a" component={MyInput} flavor="sweet" />;

// ---------------------------------------------------------------------------
// Field with reactstrap-like component (index signature): typed keys STAY strict
// ---------------------------------------------------------------------------

// @ts-expect-error — cssModule must match { className: string }
const f6 = <Field name="a" component={LooseInput} cssModule={12} />;

// @ts-expect-error — bsSize must be 'sm' | 'lg'
const f7 = <Field name="a" component={LooseInput} bsSize={42} />;

// (typos on properties that only exist via the index signature ARE accepted —
// e.g. `<Field component={LooseInput} anythingAtAll="ok" />` — this is the
// documented trade-off of SafePropsOmit.)

// ---------------------------------------------------------------------------
// Field — ref must match the underlying component's ref type
// ---------------------------------------------------------------------------

const WrongRefKind = () => {
	const wrongRef = useRef<HTMLDivElement>(null);
	// @ts-expect-error — <input> refs must be HTMLInputElement, not HTMLDivElement
	return <Field name="a" component="input" ref={wrongRef} />;
};

// ---------------------------------------------------------------------------
// Field — polymorphic onChange must match component's onChange signature
// ---------------------------------------------------------------------------

// Component that emits a raw string, not a DOM event.
type ValueEmitterProps = {
	value?: string;
	onChange: (value: string) => void;
};
const ValueEmitter = (_p: ValueEmitterProps) => <input />;

const WrongValueEmitterHandler = () => (
	<Field
		name="phone"
		component={ValueEmitter}
		// @ts-expect-error — event-based handler on a value-emitting component
		onChange={(event: { target: { value: string } }) => event.target.value}
	/>
);

// ---------------------------------------------------------------------------
// Form — required props
// ---------------------------------------------------------------------------

// @ts-expect-error — schema + onSubmit missing
const F1 = <Form />;

// @ts-expect-error — onSubmit missing
const F2 = <Form schema={schema} />;

// @ts-expect-error — schema missing
const F3 = <Form onSubmit={() => {}} />;

// ---------------------------------------------------------------------------
// Form schema — JSONSchema7Definition typing catches typos
// ---------------------------------------------------------------------------

// @ts-expect-error — 'objct' is not a valid JSONSchema7 type
const F4 = <Form schema={{ type: 'objct' }} onSubmit={() => {}} />;

// ---------------------------------------------------------------------------
// Form.errorMessages — values must be functions
// ---------------------------------------------------------------------------

// @ts-expect-error — 'not a function' is not an ErrorMessageFn
const F5 = <Form schema={schema} onSubmit={() => {}} errorMessages={{ required: 'not a function' }} />;

// ---------------------------------------------------------------------------
// Form<T> — data shape must match T
// ---------------------------------------------------------------------------

// @ts-expect-error — { wrong: 'x' } is not assignable to UserData
const F6 = <Form<UserData> data={{ wrong: 'x' }} schema={schema} onSubmit={() => {}} />;

// ---------------------------------------------------------------------------
// Form<T>.onChange — handler param must accept `T`, not an unrelated type
// ---------------------------------------------------------------------------

type OtherData = { totallyDifferent: boolean };
// @ts-expect-error — onChange param type is incompatible with declared UserData
const F7 = <Form<UserData> schema={schema} onSubmit={() => {}} onChange={(d: OtherData) => void d} />;

// ---------------------------------------------------------------------------
// FieldError — required prop + typed errorMessages
// ---------------------------------------------------------------------------

// @ts-expect-error — name is required
const E1 = <FieldError />;

// @ts-expect-error — errorMessages must have function values
const E2 = <FieldError name="x" errorMessages={{ required: 42 }} />;

// ---------------------------------------------------------------------------
// Consume all bindings so the compiler doesn't drop them
// ---------------------------------------------------------------------------
export {
	f1, f2, f3, f4, f5, f6, f7,
	WrongRefKind,
	WrongValueEmitterHandler,
	F1, F2, F3, F4, F5, F6, F7,
	E1, E2,
};
