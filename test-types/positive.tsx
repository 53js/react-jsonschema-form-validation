/**
 * Positive type tests — real-world usage patterns that MUST compile.
 * Run against @types/react 18 and 19 in CI (matrix jobs) and locally
 * via `yarn test:types` (see check-matrix.sh).
 *
 * Structure of each block:
 * - a small snippet a consumer would actually write
 * - if useful, a type-level assertion via `Expect<Equal<...>>` proving that
 *   inference gives what we expect
 */
import type { AnySchemaObject } from 'ajv';
import React, { useRef, useState } from 'react';
import Form, {
	Field,
	FieldError,
	FormContext,
	useFormContext,
	withFormContext,
} from 'react-jsonschema-form-validation';
import type {
	FieldProps,
	FieldErrorProps,
	FormProps,
	FieldBaseProps,
	FieldErrorBaseProps,
	FormBaseProps,
	FormContextValue,
	FormattedError,
	FormChangeEvent,
	FormInputTarget,
	FieldChangeHandler,
	ErrorMessageFn,
	ErrorMessagesMap,
	AjvKeyword,
	SafePropsOmit,
} from 'react-jsonschema-form-validation';

import { ajvSchema, createAjv } from 'react-jsonschema-form-validation/providers/ajv';
import type { ErrorCode, FormError, StandardSchema } from 'react-jsonschema-form-validation';

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
// 1. Basic usage — data typed, onChange inferred
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

// Type-level check: <Form<T>>'s onChange receives `T`, not `Record<string, unknown>`.
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

// ---------------------------------------------------------------------------
// 1b. resetOnSubmit opt-out + companion context reset()
// ---------------------------------------------------------------------------
const KeepStateOnSubmit = () => (
	<Form
		schema={schema}
		onSubmit={() => {}}
		resetOnSubmit={false}
	>
		<Field name="email" />
	</Form>
);

const ResetButton = () => {
	const ctx = useFormContext();
	return <button type="button" onClick={ctx.reset}>Reset</button>;
};

// Type-level check: the context's `reset` is a niladic void function.
type _ResetIsNiladicVoid = Expect<Equal<FormContextValue['reset'], () => void>>;

// ---------------------------------------------------------------------------
// 2. Polymorphic component (intrinsic textarea) — native props typed
// ---------------------------------------------------------------------------
const Textarea = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field name="bio" component="textarea" rows={5} cols={40} />
	</Form>
);

// ---------------------------------------------------------------------------
// 3. Custom component with strict props — inference works
// ---------------------------------------------------------------------------
type MyInputProps = { label: string; flavor: 'sweet' | 'savory' };
const MyInput = (p: MyInputProps) => <input data-flavor={p.flavor} />;
const Strict = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field name="dish" component={MyInput} label="Plat" flavor="savory" />
	</Form>
);

// ---------------------------------------------------------------------------
// 4. forwardRef component with typed ref
// ---------------------------------------------------------------------------
type MyHandle = { focus(): void };
const MyForwardInput = React.forwardRef<MyHandle, { label: string }>(
	(_props, _ref) => <input />,
);
const Ref = () => {
	const nativeRef = useRef<HTMLInputElement>(null);
	const customRef = useRef<MyHandle>(null);
	return (
		<Form schema={schema} onSubmit={() => {}}>
			<Field name="a" ref={nativeRef} />
			<Field name="b" component={MyForwardInput} label="x" ref={customRef} />
		</Form>
	);
};

// Callback ref narrowing: TS infers the correct element type from `component`.
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

// ---------------------------------------------------------------------------
// 5. React.memo — memoized components must be usable as `component`
// ---------------------------------------------------------------------------
const MemoInput = React.memo(MyInput);
const WithMemo = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field name="x" component={MemoInput} label="l" flavor="sweet" />
	</Form>
);

// ---------------------------------------------------------------------------
// 5b. Polymorphic onChange — first parameter follows what `component` emits
// ---------------------------------------------------------------------------

// Component that emits a raw string.
type ValueEmitterProps = {
	value?: string;
	onChange: (value: string) => void;
};
const ValueEmitter = (_p: ValueEmitterProps) => <input />;

const _valueEmitterInfersString = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field
			name="phone"
			component={ValueEmitter}
			onChange={(value, hfc) => {
				type _v = Expect<Equal<typeof value, string>>;
				type _h = Expect<Equal<typeof hfc, FormContextValue['handleFieldChange']>>;
				void [value, hfc];
			}}
		/>
	</Form>
);

// Component that emits an option object (only the first parameter is captured).
type Option = { value: string; label: string };
type OptionEmitterProps = {
	value?: Option | null;
	onChange: (option: Option | null) => void;
};
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

// Intrinsic input — `onChange` still receives a real DOM ChangeEvent.
const _inputOnChangeReceivesEvent = () => (
	<Form schema={schema} onSubmit={() => {}}>
		<Field
			name="x"
			onChange={(event) => {
				void event.target.value;
			}}
		/>
	</Form>
);

// onBlur is polymorphic too — first parameter follows `C.onBlur`.
type CustomBlurProps = {
	onBlur: (payload: { field: string; timestamp: number }) => void;
};
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

// Backward-compat — a handler typed explicitly as `FieldChangeHandler`
// stays assignable to a default `<Field>` (no `component` prop).
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
// 6. Polymorphic Form wrapper — `component="section"` accepts native props
// ---------------------------------------------------------------------------
const PolymorphicForm = () => (
	<Form
		schema={schema}
		onSubmit={() => {}}
		component="section"
		id="my-form"
		className="foo"
	>
		<Field name="email" />
	</Form>
);

// ---------------------------------------------------------------------------
// 7. useFormContext — non-null return (thanks to the runtime guard)
// ---------------------------------------------------------------------------
const SubmitIfValid = () => {
	const ctx = useFormContext();
	return <button type="submit" disabled={!ctx.valid}>Submit</button>;
};

// Type-level check: the hook return type must be `FormContextValue` (not
// `FormContextValue | undefined`), because the runtime guard throws.
type _CtxNonNull = Expect<Equal<ReturnType<typeof useFormContext>, FormContextValue>>;

// ---------------------------------------------------------------------------
// 8. errorMessages autocomplete on AJV keywords + custom keyword accepted
// ---------------------------------------------------------------------------
const Errors = () => (
	<Form
		schema={schema}
		onSubmit={() => {}}
		errorMessages={{
			required: (err) => `${err.field} is required`,
			minLength: (err) => `${err.field} too short`,
			defaultMessage: (err) => err.message ?? 'invalid',
			customKeyword: (err) => `custom: ${err.message}`,
		}}
	>
		<Field name="email" />
		<FieldError
			name="email"
			errorMessages={{ required: () => 'Email is required' }}
		/>
	</Form>
);

// Type-level check: ErrorMessagesMap values are always ErrorMessageFn (never
// a plain string), so a `Record<AjvKeyword, string>` should NOT extend it.
type _ErrMapValuesAreFns = Expect<Equal<
	NonNullable<ErrorMessagesMap[AjvKeyword]>,
	ErrorMessageFn
>>;

// Type-level check (issue #6): the verbose-mode properties inherited from
// AJV 8's `ErrorObject` (`data?: unknown`, `parentSchema?: AnySchemaObject`)
// are visible on the error received by an errorMessages callback, so
// interpolating the current field value compiles without casting. Locked
// to AJV's declared types — if either ever disappeared from the error
// type, the indexed access below would fail to compile.
type _ErrCallbackDataExposed = Expect<Equal<
	Parameters<ErrorMessageFn>[0]['data'],
	unknown
>>;
type _ErrCallbackParentSchemaExposed = Expect<Equal<
	Parameters<ErrorMessageFn>[0]['parentSchema'],
	AnySchemaObject | undefined
>>;

// Usage: a callback quoting the offending value (issue #6) compiles.
const dataAwareMessages: ErrorMessagesMap = {
	minLength: (err) => `"${err.data}" is too short`,
};
void dataAwareMessages;

// ---------------------------------------------------------------------------
// 9. Legacy render-prop still works
// ---------------------------------------------------------------------------
const Legacy = () => withFormContext((ctx) => <span>{ctx.valid ? 'ok' : 'ko'}</span>);

// ---------------------------------------------------------------------------
// 10. Advanced: FormContext exposed for users that want the Provider directly
// ---------------------------------------------------------------------------
void FormContext;

// ---------------------------------------------------------------------------
// 11. Smoke test — every public type name resolves
// ---------------------------------------------------------------------------
type _AllTypesResolve = {
	fieldProps: FieldProps<'input'>;
	fieldErrorProps: FieldErrorProps<'div'>;
	formProps: FormProps<UserData, 'form'>;
	fieldBase: FieldBaseProps;
	fieldErrorBase: FieldErrorBaseProps;
	formBase: FormBaseProps;
	ctx: FormContextValue;
	formattedError: FormattedError;
	changeEvent: FormChangeEvent;
	inputTarget: FormInputTarget;
	changeHandler: FieldChangeHandler;
	errorFn: ErrorMessageFn;
	errorMap: ErrorMessagesMap;
	keyword: AjvKeyword;
	safeOmit: SafePropsOmit<{ a: string; [k: string]: unknown }, 'a'>;
};

// ---------------------------------------------------------------------------
// 12. providers/ajv subpath (RFC 0001) — resolves under moduleResolution: node
//     through `typesVersions`; core types come from the root entry.
// ---------------------------------------------------------------------------
const standard: StandardSchema<UserData> = ajvSchema<UserData>(schema, { ajv: createAjv() });
const _issues = standard['~standard'].validate({ email: 'nope', age: -1 });
void _issues;

const _formError = (err: FormError) => {
	const code: ErrorCode = err.code;
	const field: string = err.field;
	const params: Record<string, unknown> = err.params;
	void [code, field, params, err.raw, err.message];
};
void _formError;

// ErrorCode keeps the 9 normalized literals AND accepts any provider code.
const _knownCode: ErrorCode = 'minLength';
const _providerCode: ErrorCode = 'multipleOf';
void [_knownCode, _providerCode];
type _CoreCodesAssignable = Expect<Equal<'min' extends ErrorCode ? true : false, true>>;

// The default AJV instance of createAjv() is AJV 8 (compile-capable).
type _CreateAjvCompiles = Expect<Equal<'compile' extends keyof ReturnType<typeof createAjv> ? true : false, true>>;

export {
	Basic,
	KeepStateOnSubmit,
	ResetButton,
	Textarea,
	Strict,
	Ref,
	WithMemo,
	PolymorphicForm,
	SubmitIfValid,
	Errors,
	Legacy,
};
export type {
	_CtxNonNull, _ErrMapValuesAreFns, _AllTypesResolve, _ResetIsNiladicVoid,
	_CoreCodesAssignable, _CreateAjvCompiles,
};
