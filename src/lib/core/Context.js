'use client';

import React, { useContext } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';

import { selectFormState, shallowEqual } from './selectors';

/**
 * @import { ReactElement, ReactNode } from 'react'
 * @import { FormApi } from './useForm'
 * @import { ErrorMessagesMap } from './types'
 */

/**
 * React context carrying the `FormApi` of the nearest `<Form>` ancestor —
 * the HTML "form owner" default. The value is the referentially stable
 * `FormApi` object itself: the context never re-renders anyone by itself;
 * consumers subscribe to the form store (`useFormContext` coarsely,
 * `<Field>` / `<FieldError>` through fine selectors).
 */
const FormContext = React.createContext(
	/** @type {FormApi<any> | undefined} */ (undefined),
);

export default FormContext;

/**
 * Form-level `errorMessages` map, provided by `<Form>` (its prop in sugar
 * mode, the owner's latest config in hook mode) and read by `<FieldError>`.
 * A context rather than store state: an inline map literal is a new value
 * on every render of its owner, and a store write per render would loop.
 */
export const ErrorMessagesContext = React.createContext(
	/** @type {ErrorMessagesMap | undefined} */ (undefined),
);

const OUTSIDE_FORM_ERROR = (
	'react-jsonschema-form-validation: '
	+ 'useFormContext / withFormContext must be used inside a <Form> component.'
);

/**
 * Reads the form context and subscribes the caller to the form state
 * (`valid`, `errors`, `touchedFields`, `isSubmitted` — the 0.x contract:
 * `const { valid } = useFormContext()` re-renders when validity changes).
 * Throws if the calling component is not a descendant of a `<Form>` —
 * failing loudly is better than returning `undefined` and crashing later
 * with a less obvious error.
 *
 * @template [T = Record<string, unknown>]
 * @returns {FormApi<T>}
 */
export const useFormContext = () => {
	const ctx = useContext(FormContext);
	if (ctx === undefined) {
		throw new Error(OUTSIDE_FORM_ERROR);
	}
	useSyncExternalStoreWithSelector(
		ctx.subscribe,
		ctx.getState,
		ctx.getState,
		selectFormState,
		shallowEqual,
	);
	return ctx;
};

/**
 * Association resolution shared by `<Field>` / `<FieldError>`, following
 * the HTML form-owner rules: an explicit `form` prop wins (the React
 * counterpart of the `form=""` content attribute), then the nearest
 * `<Form>` ancestor; neither → throw (deliberate divergence from HTML,
 * which silently de-associates — the class of bug #55 fixed). Does NOT
 * subscribe: the components select exactly what they render.
 *
 * @param {FormApi<any> | undefined} formProp
 * @param {string} componentName
 * @returns {FormApi<any>}
 */
export const useResolvedForm = (formProp, componentName) => {
	const ctx = useContext(FormContext);
	const form = formProp !== undefined ? formProp : ctx;
	if (form === undefined) {
		throw new Error(
			`react-jsonschema-form-validation: <${componentName}> must be rendered inside a <Form>, `
			+ 'or receive the form explicitly through its `form` prop.',
		);
	}
	return form;
};

/**
 * @param {{ children: (ctx: FormApi<any>) => ReactNode }} props
 */
const FormContextSubscriber = ({ children }) => {
	const ctx = useFormContext();
	return <>{children(ctx)}</>;
};

/**
 * Legacy render-prop helper kept for backward compatibility — prefer
 * `useFormContext()` in new code. Same reactivity and same throw outside a
 * `<Form>` as the hook (the callback runs in a small subscribing component).
 *
 * @template {ReactNode} T
 * @param {(ctx: FormApi<any>) => T} cb
 * @returns {ReactElement}
 */
export const withFormContext = (cb) => <FormContextSubscriber>{cb}</FormContextSubscriber>;
