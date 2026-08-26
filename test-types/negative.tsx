/**
 * Negative type tests — usages that MUST NOT compile.
 *
 * Each block is preceded by `// @ts-expect-error`. If TypeScript stops
 * flagging the underlying error, the directive becomes "unused" and CI
 * fails with an explicit error.
 *
 * v1 (RFC 0001): the dual-mode union checks (`form` + config props), the
 * `FormApi`-typed `form` prop, `useForm` config, `/core` without a
 * JSON Schema sugar.
 */
import React, { useRef } from 'react';
import { Form, Field, FieldError, useForm } from 'react-jsonschema-form-validation';
import { Form as CoreForm, useForm as useCoreForm } from 'react-jsonschema-form-validation/core';

type UserData = { email: string; age: number };
const schema = { type: 'object' as const };

type MyInputProps = { label: string; flavor: 'sweet' | 'savory' };
const MyInput = (p: MyInputProps) => <input data-flavor={p.flavor} />;

type LooseInputProps = {
	cssModule?: { className: string };
	bsSize?: 'sm' | 'lg';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
};
const LooseInput = (_p: LooseInputProps) => <input />;

// ---------------------------------------------------------------------------
// Form — dual mode: hook mode masks every validation-config prop and `id`
// ---------------------------------------------------------------------------

const HookAndSchema = () => {
	const form = useForm<UserData>({ schema });
	// @ts-expect-error — `form` and `schema` are mutually exclusive
	return <Form form={form} schema={schema} onSubmit={() => {}} />;
};

const HookAndData = () => {
	const form = useForm<UserData>({ schema });
	// @ts-expect-error — `data` belongs to useForm in hook mode
	return <Form form={form} data={{ email: '', age: 0 }} onSubmit={() => {}} />;
};

const HookAndAjv = () => {
	const form = useForm<UserData>({ schema });
	// @ts-expect-error — `ajv` belongs to useForm in hook mode
	return <Form form={form} ajv={{ compile: () => () => true }} onSubmit={() => {}} />;
};

const HookAndErrorMessages = () => {
	const form = useForm<UserData>({ schema });
	// @ts-expect-error — `errorMessages` belongs to useForm in hook mode
	return <Form form={form} errorMessages={{}} onSubmit={() => {}} />;
};

const HookAndId = () => {
	const form = useForm<UserData>({ schema });
	// @ts-expect-error — the id lives on the form object (useForm({ id }))
	return <Form form={form} id="checkout" onSubmit={() => {}} />;
};

const HookWithoutOnSubmit = () => {
	const form = useForm<UserData>({ schema });
	// @ts-expect-error — onSubmit is required in hook mode too
	return <Form form={form} />;
};

// `form` props take the FormApi object, never a string id.
// @ts-expect-error — string ids would let the DOM and React associations diverge
const f0 = <Field name="a" form="checkout" />;
// @ts-expect-error — same for FieldError
const e0 = <FieldError name="a" form="checkout" />;

// useForm — schema is required and must be a Standard Schema or JSON Schema
// @ts-expect-error — schema missing
const u1 = () => useForm<UserData>({});
// @ts-expect-error — a string is neither
const u2 = () => useForm<UserData>({ schema: 'nope' });
// @ts-expect-error — data must match T
const u3 = () => useForm<UserData>({ schema, data: { wrong: true } });

// /core — Standard Schema only: no JSON Schema sugar, no `ajv`
// @ts-expect-error — a plain JSON Schema is not a Standard Schema
const c1 = () => useCoreForm<UserData>({ schema });
// @ts-expect-error — `ajv` is a root-entry option
const c2 = () => useCoreForm<UserData>({ schema: { '~standard': { version: 1, vendor: 'x', validate: (v: unknown) => ({ value: v as UserData }) } }, ajv: {} });
// @ts-expect-error — the core <Form> does not accept a plain JSON Schema either
const c3 = <CoreForm schema={schema} onSubmit={() => {}} />;

// ---------------------------------------------------------------------------
// Field — unchanged from 0.x
// ---------------------------------------------------------------------------

// @ts-expect-error — name is required
const f1 = <Field />;
// @ts-expect-error — name must be string
const f2 = <Field name={42} />;
// @ts-expect-error — 'textarea' has no `href` prop
const f3 = <Field name="a" component="textarea" href="/x" />;
// @ts-expect-error — flavor must be 'sweet' | 'savory'
const f4 = <Field name="a" component={MyInput} label="l" flavor="WRONG" />;
// @ts-expect-error — required `label` missing
const f5 = <Field name="a" component={MyInput} flavor="sweet" />;
// @ts-expect-error — cssModule must match { className: string }
const f6 = <Field name="a" component={LooseInput} cssModule={12} />;
// @ts-expect-error — bsSize must be 'sm' | 'lg'
const f7 = <Field name="a" component={LooseInput} bsSize={42} />;

const WrongRefKind = () => {
	const wrongRef = useRef<HTMLDivElement>(null);
	// @ts-expect-error — <input> refs must be HTMLInputElement, not HTMLDivElement
	return <Field name="a" component="input" ref={wrongRef} />;
};

type ValueEmitterProps = { value?: string; onChange: (value: string) => void };
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
// Form — sugar mode required props and typing
// ---------------------------------------------------------------------------

// @ts-expect-error — schema + onSubmit missing
const F1 = <Form />;
// @ts-expect-error — onSubmit missing
const F2 = <Form schema={schema} />;
// @ts-expect-error — schema missing
const F3 = <Form onSubmit={() => {}} />;
// @ts-expect-error — 'objct' is not a valid JSONSchema7 type
const F4 = <Form schema={{ type: 'objct' }} onSubmit={() => {}} />;
// @ts-expect-error — 'not a function' is not an ErrorMessageFn
const F5 = <Form schema={schema} onSubmit={() => {}} errorMessages={{ required: 'not a function' }} />;
// @ts-expect-error — { wrong: 'x' } is not assignable to UserData
const F6 = <Form<UserData> data={{ wrong: 'x' }} schema={schema} onSubmit={() => {}} />;
type OtherData = { totallyDifferent: boolean };
// @ts-expect-error — onChange param type is incompatible with declared UserData
const F7 = <Form<UserData> schema={schema} onSubmit={() => {}} onChange={(d: OtherData) => void d} />;

// ---------------------------------------------------------------------------
// FieldError
// ---------------------------------------------------------------------------

// @ts-expect-error — name is required
const E1 = <FieldError />;
// @ts-expect-error — errorMessages must have function values
const E2 = <FieldError name="x" errorMessages={{ required: 42 }} />;

export {
	HookAndSchema, HookAndData, HookAndAjv, HookAndErrorMessages, HookAndId, HookWithoutOnSubmit,
	f0, e0, u1, u2, u3, c1, c2, c3,
	f1, f2, f3, f4, f5, f6, f7,
	WrongRefKind, WrongValueEmitterHandler,
	F1, F2, F3, F4, F5, F6, F7,
	E1, E2,
};
