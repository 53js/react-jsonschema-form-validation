'use client';

/**
 * @import {
 *   ReactNode,
 *   ElementType,
 *   FormEvent,
 *   ComponentProps,
 *   ForwardRefRenderFunction,
 * } from 'react'
 * @import { FormApi, UseFormConfig, JfvScrollOptions } from './useForm'
 * @import { SafePropsOmit } from './types'
 */

import classnames from 'classnames';
import React, {
	forwardRef, useCallback, useEffect, useRef, useSyncExternalStore,
} from 'react';

import { FormContext, ErrorMessagesContext } from './Context';
import { getInternals } from './internals';
import { useFormStore } from './useForm';
import { useFormSelector } from './useFormSelector';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

/**
 * Validation configuration accepted by `<Form>` in sugar mode — forwarded
 * verbatim to its internal `useForm()`. Masked to `never` in hook mode.
 *
 * @template [T = Record<string, unknown>]
 * @typedef {Omit<UseFormConfig<T>, 'id'>} FormConfigProps
 */

/**
 * Props shared by both modes: submit behavior + presentation.
 *
 * - `onSubmit`      — called only when validation passes at submit time.
 * - `resetOnSubmit` — when `false`, touched/submitted state is kept after a
 *                     successful submit (default `true`).
 * - `id`            — sugar mode only: effective form id (default `useId()`).
 *                     In hook mode the id belongs to `useForm({ id })`.
 * - `component`     — element rendered for the form wrapper (default `'form'`,
 *                     rendered with `noValidate`).
 *
 * @template {ElementType} [C = 'form']
 * @typedef {{
 *   onSubmit: (event: FormEvent) => void,
 *   resetOnSubmit?: boolean,
 *   scrollToError?: boolean,
 *   scrollOptions?: JfvScrollOptions,
 *   id?: string,
 *   className?: string,
 *   component?: C,
 *   children?: ReactNode,
 * }} FormSharedProps
 */

/**
 * Hook mode: the parent owns the form (`useForm`) and passes it down. Every
 * validation-config prop — and `id`, which lives on the api — is masked to
 * `never`, so mixing the two modes is a compile error, not a precedence rule.
 *
 * @template [T = Record<string, unknown>]
 * @template {ElementType} [C = 'form']
 * @typedef {(
 *   { form: FormApi<T>, id?: never }
 *   & { [K in keyof FormConfigProps<T>]?: never }
 *   & Omit<FormSharedProps<C>, 'id'>
 * )} FormHookModeProps
 */

/**
 * Sugar mode: `<Form>` calls `useForm` internally with these props.
 *
 * @template [T = Record<string, unknown>]
 * @template {ElementType} [C = 'form']
 * @typedef {(
 *   { form?: never }
 *   & FormConfigProps<T>
 *   & FormSharedProps<C>
 * )} FormSugarModeProps
 */

/**
 * Keys the library handles itself, removed from the wrapped component's
 * own props before merging them in.
 *
 * @typedef {(
 *   keyof FormConfigProps | keyof FormSharedProps | 'form' | 'ref'
 * )} ReservedFormPropKeys
 */

/**
 * Polymorphic props of the core `<Form>` (Standard Schema only — the root
 * entry widens `schema` to plain JSON Schema and adds `ajv`).
 *
 * @template [T = Record<string, unknown>]
 * @template {ElementType} [C = 'form']
 * @typedef {(
 *   (FormHookModeProps<T, C> | FormSugarModeProps<T, C>)
 *   & SafePropsOmit<ComponentProps<C>, ReservedFormPropKeys>
 * )} FormProps
 */

/**
 * Loosely-typed props of the internal implementation (the union is
 * enforced on the public export below).
 *
 * @typedef {{
 *   form?: FormApi<any>,
 *   schema?: UseFormConfig<any>['schema'],
 *   data?: Record<string, unknown>,
 *   onChange?: UseFormConfig<any>['onChange'],
 *   errorMessages?: UseFormConfig<any>['errorMessages'],
 *   throttleDuration?: number,
 *   id?: string,
 *   onSubmit?: (event: FormEvent) => void,
 *   resetOnSubmit?: boolean,
 *   scrollToError?: boolean,
 *   scrollOptions?: JfvScrollOptions,
 *   className?: string,
 *   component?: ElementType,
 *   children?: ReactNode,
 *   [key: string]: unknown,
 * }} FormInnerProps
 */

/** @param {import('./store').FormState} state */
const selectIsSubmitted = (state) => state.isSubmitted;

/**
 * Thin binder around a `FormApi`: context provider + `<form>` element +
 * DOM wiring. In sugar mode the api is created here through
 * `useFormStore`; in hook mode the `form` prop is used and no internal
 * instance exists.
 *
 * @type {ForwardRefRenderFunction<HTMLFormElement, FormInnerProps>}
 */
const FormRender = (props, ref) => {
	const {
		form: externalForm,
		schema,
		data,
		onChange,
		errorMessages,
		throttleDuration,
		id,
		onSubmit,
		resetOnSubmit,
		scrollToError,
		scrollOptions,
		className,
		component: FormComponent = 'form',
		children,
		...rest
	} = props;

	if (externalForm && id !== undefined) {
		throw new Error(
			'react-jsonschema-form-validation: <Form form={…}> received an `id` prop; '
			+ 'the id belongs to the form object — pass it to useForm({ id }) instead.',
		);
	}
	if (!externalForm && !schema) {
		throw new Error(
			'react-jsonschema-form-validation: <Form> needs either a `form` (from useForm) or a `schema`.',
		);
	}

	// Cast: guarded above (sugar mode always carries a schema).
	const sugarSchema = /** @type {NonNullable<typeof schema>} */ (schema);
	const internalForm = useFormStore(externalForm ? null : {
		schema: sugarSchema,
		data,
		onChange,
		errorMessages,
		throttleDuration,
		id,
	});
	const form = /** @type {FormApi<any>} */ (externalForm || internalForm);

	const internals = getInternals(form);

	// Latest-props binding for the submit path (`handleSubmit`,
	// `reportValidity` read them at call time) — after commit, never during
	// render.
	useIsomorphicLayoutEffect(() => {
		internals.bindSubmit({
			onSubmit,
			resetOnSubmit,
			scrollToError,
			scrollOptions,
		});
	});

	// Form-level errorMessages for the <FieldError>s: the prop in sugar mode;
	// in hook mode the owner's latest map, read through the api's config
	// channel so a change re-renders this provider once committed.
	const ownerErrorMessages = useSyncExternalStore(
		internals.subscribeConfig,
		internals.getErrorMessages,
		internals.getErrorMessages,
	);
	const providedErrorMessages = externalForm ? ownerErrorMessages : errorMessages;

	const isSubmitted = useFormSelector(form, selectIsSubmitted, Object.is);

	// Dev-time check: the element carrying `form.id` must be THE <form>
	// element, or the native association (`form` attribute on the fields)
	// and requestSubmit() silently break — a custom `component` that does
	// not forward `id`, or that renders something else than a <form>.
	const elementRef = useRef(/** @type {HTMLElement | null} */ (null));
	const setElement = useCallback(
		/** @param {HTMLFormElement | null} node */
		(node) => {
			elementRef.current = node;
			if (typeof ref === 'function') ref(node);
			else if (ref) ref.current = node;
		},
		[ref],
	);
	useEffect(() => {
		if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production') return;
		const found = document.getElementById(form.id);
		if (found === elementRef.current && found instanceof HTMLFormElement) return;
		const got = found ? `a <${found.tagName.toLowerCase()}>` : 'nothing';
		console.error( // eslint-disable-line no-console
			'react-jsonschema-form-validation: <Form component> must render a <form> element '
			+ 'and forward the `id` prop — native association (form attribute) and '
			+ `requestSubmit() break otherwise. Found ${got} at id "${form.id}".`,
		);
	}, [form]);

	// `noValidate` on the native element only: the library owns validation
	// and the unstylable native bubbles must stay out of the way.
	const nativeProps = FormComponent === 'form' ? { noValidate: true } : {};

	return (
		<FormContext.Provider value={form}>
			<ErrorMessagesContext.Provider value={providedErrorMessages}>
				<FormComponent
					id={form.id}
					className={classnames('Jfv_Form', className, { isSubmitted })}
					onSubmit={form.handleSubmit}
					ref={setElement}
					{...nativeProps}
					{...rest}
				>
					{children}
				</FormComponent>
			</ErrorMessagesContext.Provider>
		</FormContext.Provider>
	);
};

const FormElement = forwardRef(FormRender);
FormElement.displayName = 'Form';

// Polymorphic re-typing: the implementation is loosely typed; the cast on
// the export restores the discriminated union and both generics.
/**
 * Public signature of the core `<Form>`: polymorphic on `T` (data shape) and
 * `C` (wrapper element), dual-mode union enforced through `FormProps`.
 *
 * @typedef {<T = Record<string, unknown>, C extends ElementType = 'form'>(
 *   props: FormProps<T, C> & { ref?: React.Ref<HTMLFormElement> }
 * ) => JSX.Element | null} FormComponentType
 */

export const Form = /** @type {FormComponentType} */ (/** @type {unknown} */ (FormElement));
