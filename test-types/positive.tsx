/**
 * Positive type tests — real-world usage patterns that MUST compile.
 * Run against @types/react 16, 17 and 18 in CI (matrix jobs) and locally
 * via `yarn test:types` (see check-matrix.sh).
 *
 * Structure of each block:
 * - a small snippet a consumer would actually write
 * - if useful, a type-level assertion via `Expect<Equal<...>>` proving that
 *   inference gives what we expect
 */
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

export {
	Basic,
	Textarea,
	Strict,
	Ref,
	WithMemo,
	PolymorphicForm,
	SubmitIfValid,
	Errors,
	Legacy,
};
export type { _CtxNonNull, _ErrMapValuesAreFns, _AllTypesResolve };
