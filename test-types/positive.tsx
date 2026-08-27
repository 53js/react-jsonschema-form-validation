/**
 * Positive type tests — real-world usage patterns that MUST compile.
 * Run against @types/react 18 and 19 in CI (matrix jobs) and locally
 * via `yarn test:types` (see check-matrix.sh).
 *
 * v1 surface (RFC 0001): `useForm`, dual-mode `<Form>`, `FormApi`,
 * normalized `FormError` / `ErrorCode`, the `/core` and `/providers/ajv`
 * entries.
 */
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import React, { useRef, useState } from 'react';
import {
	Form,
	Field,
	FieldError,
	FormContext,
	useForm,
	useFormContext,
	useFormSelector,
	withFormContext,
} from 'react-jsonschema-form-validation';
import type {
	FieldProps,
	FieldErrorProps,
	FormProps,
	FormApi,
	FormError,
	FormState,
	FormChangeEvent,
	FormInputTarget,
	FieldChangeHandler,
	ErrorMessageFn,
	ErrorMessagesMap,
	ErrorCode,
	ProviderIssue,
	SafePropsOmit,
	StandardSchema,
	StandardSchemaIssue,
} from 'react-jsonschema-form-validation';
import {
	Form as CoreForm,
	useForm as useCoreForm,
	isStandardSchema,
} from 'react-jsonschema-form-validation/core';
import { ajvSchema, createAjv } from 'react-jsonschema-form-validation/providers/ajv';

import { Expect, Equal } from './_helpers';

type UserData = { email: string; age: number };
const schema = {
	type: 'object' as const,
	properties: {
		email: { type: 'string' as const, format: 'email' },
		age: { type: 'number' as const, minimum: 0 },
	},
	required: ['email'],
};

// ---------------------------------------------------------------------------
// 1. Sugar mode — unchanged 5-line usage, data typed, onChange inferred
// ---------------------------------------------------------------------------
const Basic = () => {
	const [user, setUser] = useState<UserData>({ email: '', age: 0 });
	return (
		<Form<UserData>
			data={user}
			schema={schema}
			onChange={(d) => setUser(d)}
			onSubmit={(e) => e.preventDefault()}
		>
			<Field name="email" type="email" placeholder="…" />
			<FieldError name="email" />
			<button type="submit">Go</button>
		</Form>
	);
};

const _onChangeInfersT = () => (
	<Form<UserData>
		schema={schema}
		onSubmit={() => {}}
		onChange={(d) => {
			type _ = Expect<Equal<typeof d, UserData>>;
			void d;
		}}
	/>
);

const KeepStateOnSubmit = () => (
	<Form schema={schema} onSubmit={() => {}} resetOnSubmit={false} scrollToError={false} id="keep">
		<Field name="email" />
	</Form>
);

// ---------------------------------------------------------------------------
// 2. Hook mode — parent owns the form, reads reactive state, passes it down
// ---------------------------------------------------------------------------
const HookMode = () => {
	const [user, setUser] = useState<UserData>({ email: '', age: 0 });
	const form = useForm<UserData>({ schema, data: user, onChange: setUser });
	type _ = Expect<Equal<typeof form, FormApi<UserData>>>;
	return (
		<Form form={form} onSubmit={() => {}} resetOnSubmit={false} scrollToError>
			<Field name="email" />
			<FieldError name="email" />
			<button type="submit" disabled={!form.valid}>Save</button>
			<button type="button" onClick={form.reset}>Reset</button>
		</Form>
	);
};

// useForm infers T from data/onChange without the explicit generic.
const _useFormInfersFromData = () => {
	const [user, setUser] = useState<UserData>({ email: '', age: 0 });
	const form = useForm({ schema, data: user, onChange: setUser });
	type _ = Expect<Equal<typeof form, FormApi<UserData>>>;
	return form;
};

// Explicit association outside the <Form> subtree (portal / sibling).
const Outside = () => {
	const form = useForm<UserData>({ schema, id: 'checkout' });
	return (
		<>
			<Form form={form} onSubmit={() => {}} />
			<Field name="email" form={form} />
			<FieldError name="email" form={form} />
			<button type="submit" form="checkout">Save</button>
		</>
	);
};

// Imperative API named after HTMLFormElement; reactive getters read-only.
const _imperative = (form: FormApi<UserData>) => {
	const a: boolean = form.checkValidity();
	const b: boolean = form.reportValidity();
	form.requestSubmit();
	form.reset();
	form.touch(['email', 'age']);
	form.handleFieldChange('email', 'x');
	const id: string = form.id;
	const errors: FormError[] = form.getFieldErrors(['email', 'age']);
	const state: FormState = form.getState();
	const unsubscribe: () => void = form.subscribe(() => {});
	const described: string | undefined = form.getFieldErrorDescribedBy('email');
	void [a, b, id, errors, state, unsubscribe, described, form.valid, form.touchedFields, form.isSubmitted];
};
type _ValidIsReadonly = Expect<Equal<
	{ -readonly [K in keyof FormApi]: FormApi[K] }['valid'], boolean
>>;

// ---------------------------------------------------------------------------
// 3. Standard Schema — any object with `~standard` is accepted; explicit AJV
// ---------------------------------------------------------------------------
const fakeZod: StandardSchema<UserData> = {
	'~standard': {
		version: 1,
		vendor: 'zod',
		validate: (value) => ({ value: value as UserData }),
	},
};
const _standard = () => useForm<UserData>({ schema: fakeZod });
const _explicitAjv = () => useForm<UserData>({ schema: ajvSchema(schema, { ajv: createAjv() }) });
const _customAjv = () => useForm<UserData>({ schema, ajv: new Ajv2020() });
const _defaultAjv = () => useForm<UserData>({ schema, ajv: new Ajv() });
const _standardOnForm = () => <Form schema={fakeZod} onSubmit={() => {}} />;
const _ajvOnForm = () => <Form schema={schema} ajv={createAjv()} onSubmit={() => {}} />;
const _guard = (x: unknown) => (isStandardSchema(x) ? x['~standard'].vendor : null);

// ---------------------------------------------------------------------------
// 3b. /core entry — Standard Schema only
// ---------------------------------------------------------------------------
const CoreOnly = () => {
	const form = useCoreForm<UserData>({ schema: fakeZod });
	return (
		<CoreForm form={form} onSubmit={() => {}}>
			<Field name="email" />
		</CoreForm>
	);
};
const _coreSugar = () => <CoreForm schema={ajvSchema<UserData>(schema)} onSubmit={() => {}} />;

// ---------------------------------------------------------------------------
// 4. Polymorphic Field — unchanged from 0.x
// ---------------------------------------------------------------------------
const Textarea = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field name="bio" component="textarea" rows={5} cols={40} />
	</Form>
);

type MyInputProps = { label: string; flavor: 'sweet' | 'savory' };
const MyInput = (p: MyInputProps) => <input data-flavor={p.flavor} />;
const Strict = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field name="dish" component={MyInput} label="Plat" flavor="savory" />
	</Form>
);

type MyHandle = { focus(): void };
const MyForwardInput = React.forwardRef<MyHandle, { label: string }>(
	(_props, _ref) => <input />,
);
const Ref = () => {
	const nativeRef = useRef<HTMLInputElement>(null);
	const customRef = useRef<MyHandle>(null);
	const formRef = useRef<HTMLFormElement>(null);
	return (
		<Form schema={schema} onSubmit={() => {}} ref={formRef}>
			<Field name="a" ref={nativeRef} />
			<Field name="b" component={MyForwardInput} label="x" ref={customRef} />
		</Form>
	);
};

const _refCallbackNarrowsToIntrinsic = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field
			name="a"
			component="textarea"
			ref={(el) => {
				type _ = Expect<Equal<typeof el, HTMLTextAreaElement | null>>;
				void el;
			}}
		/>
	</Form>
);

const MemoInput = React.memo(MyInput);
const WithMemo = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field name="x" component={MemoInput} label="l" flavor="sweet" />
	</Form>
);

type ValueEmitterProps = { value?: string; onChange: (value: string) => void };
const ValueEmitter = (_p: ValueEmitterProps) => <input />;
const _valueEmitterInfersString = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field
			name="phone"
			component={ValueEmitter}
			onChange={(value, hfc) => {
				type _v = Expect<Equal<typeof value, string>>;
				type _h = Expect<Equal<typeof hfc, FormApi<any>['handleFieldChange']>>;
				void [value, hfc];
			}}
		/>
	</Form>
);

type Option = { value: string; label: string };
type OptionEmitterProps = { value?: Option | null; onChange: (option: Option | null) => void };
const OptionEmitter = (_p: OptionEmitterProps) => <select />;
const _optionEmitterInfersOption = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field
			name="category"
			component={OptionEmitter}
			onChange={(option) => {
				type _ = Expect<Equal<typeof option, Option | null>>;
				void option;
			}}
		/>
	</Form>
);

const _inputOnChangeReceivesEvent = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field name="x" onChange={(event) => { void event.target.value; }} />
	</Form>
);

type CustomBlurProps = { onBlur: (payload: { field: string; timestamp: number }) => void };
const CustomBlurComponent = (_p: CustomBlurProps) => <input />;
const _blurInfersPayload = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field
			name="x"
			component={CustomBlurComponent}
			onBlur={(payload) => {
				type _ = Expect<Equal<typeof payload, { field: string; timestamp: number }>>;
				void payload;
			}}
		/>
	</Form>
);

const _fieldChangeHandlerBackwardCompat = () => {
	const legacy: FieldChangeHandler = (event, hfc) => {
		void event.target.value;
		void hfc;
	};
	return (
		<Form schema={schema} onSubmit={() => {}}>
			<Field name="x" onChange={legacy} />
		</Form>
	);
};

// ---------------------------------------------------------------------------
// 5. Polymorphic Form wrapper
// ---------------------------------------------------------------------------
const PolymorphicForm = () => (
	<Form schema={schema} onSubmit={() => {}} component="section" id="my-form" className="foo">
		<Field name="email" />
	</Form>
);

// ---------------------------------------------------------------------------
// 6. Context — returns the FormApi (non-null thanks to the runtime guard)
// ---------------------------------------------------------------------------
const SubmitIfValid = () => {
	const form = useFormContext();
	return <button type="submit" disabled={!form.valid}>Submit</button>;
};
// Instantiation expression: `ReturnType` of a generic function would erase `T`.
type _CtxIsApi = Expect<Equal<ReturnType<typeof useFormContext<UserData>>, FormApi<UserData>>>;
const Legacy = () => withFormContext((ctx) => <span>{ctx.valid ? 'ok' : 'ko'}</span>);
void FormContext;

const TouchedCount = () => {
	const form = useFormContext();
	const count = useFormSelector(form, (state) => state.touchedFields.length);
	type _ = Expect<Equal<typeof count, number>>;
	return <span>{count}</span>;
};

// ---------------------------------------------------------------------------
// 7. errorMessages keyed by normalized codes + pass-through keys; raw access
// ---------------------------------------------------------------------------
const Errors = () => (
	<Form
		schema={schema}
		onSubmit={() => {}}
		errorMessages={{
			required: (err) => `${err.field} is required`,
			min: (err) => `${err.field} must be >= ${err.params.limit}`,
			defaultMessage: (err) => err.message,
			multipleOf: (err) => `custom: ${err.message}`,
		}}
	>
		<Field name="email" />
		<FieldError name="email" errorMessages={{ format: () => 'Bad email' }} />
	</Form>
);
type _ErrMapValuesAreFns = Expect<Equal<NonNullable<ErrorMessagesMap['min']>, ErrorMessageFn>>;
type _ErrShape = Expect<Equal<Parameters<ErrorMessageFn>[0], FormError>>;
const dataAwareMessages: ErrorMessagesMap = {
	minLength: (err) => `"${(err.raw as { data?: unknown }).data}" is too short`,
};
void dataAwareMessages;
const _knownCode: ErrorCode = 'minLength';
const _providerCode: ErrorCode = 'multipleOf';
const _issue: StandardSchemaIssue = { message: 'x', path: ['email', { key: 0 }] };
const _providerIssue: ProviderIssue = { message: 'x', code: 'min', params: { limit: 1 } };
void [_knownCode, _providerCode, _issue, _providerIssue];

// ---------------------------------------------------------------------------
// 8. Smoke test — every public type name resolves
// ---------------------------------------------------------------------------
type _AllTypesResolve = {
	fieldProps: FieldProps<'input'>;
	fieldErrorProps: FieldErrorProps<'div'>;
	formProps: FormProps<UserData, 'form'>;
	api: FormApi<UserData>;
	error: FormError;
	changeEvent: FormChangeEvent;
	inputTarget: FormInputTarget;
	changeHandler: FieldChangeHandler;
	errorFn: ErrorMessageFn;
	errorMap: ErrorMessagesMap;
	code: ErrorCode;
	safeOmit: SafePropsOmit<{ a: string; [k: string]: unknown }, 'a'>;
	standard: StandardSchema;
	state: FormState;
};

export {
	Basic, KeepStateOnSubmit, HookMode, Outside, CoreOnly, Textarea, Strict, Ref, WithMemo,
	PolymorphicForm, SubmitIfValid, Errors, Legacy, TouchedCount,
};
export type {
	_CtxIsApi, _ErrMapValuesAreFns, _ErrShape, _AllTypesResolve, _ValidIsReadonly,
};
