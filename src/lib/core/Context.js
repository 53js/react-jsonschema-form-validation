'use client';

import React, { useContext } from 'react';

/**
 * @import { ReactElement, ReactNode } from 'react'
 * @import { FormApi } from './useForm'
 */

/**
 * React context carrying the `FormApi` of the nearest `<Form>` ancestor —
 * the HTML "form owner" default. The value is the referentially stable
 * `FormApi` object itself: consumers never re-render because of the context
 * (they subscribe to the form store with a selector instead).
 */
const FormContext = React.createContext(
	/** @type {FormApi<any> | undefined} */ (undefined),
);

export default FormContext;

const OUTSIDE_FORM_ERROR = (
	'react-jsonschema-form-validation: '
	+ 'useFormContext / withFormContext must be used inside a <Form> component.'
);

/**
 * Reads the form context. Throws if the calling component is not a
 * descendant of a `<Form>` — failing loudly is better than returning
 * `undefined` and crashing later with a less obvious error.
 *
 * @template [T = Record<string, unknown>]
 * @returns {FormApi<T>}
 */
export const useFormContext = () => {
	const ctx = useContext(FormContext);
	if (ctx === undefined) {
		throw new Error(OUTSIDE_FORM_ERROR);
	}
	return ctx;
};

/**
 * Association resolution shared by `<Field>` / `<FieldError>`, following
 * the HTML form-owner rules: an explicit `form` prop wins (the React
 * counterpart of the `form=""` content attribute), then the nearest
 * `<Form>` ancestor; neither → throw (deliberate divergence from HTML,
 * which silently de-associates — the class of bug #55 fixed).
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
 * Legacy render-prop helper kept for backward compatibility — prefer
 * `useFormContext()` in new code. Like `useFormContext`, it throws when
 * rendered outside a `<Form>` so the callback always receives a defined
 * context value.
 *
 * @template {ReactNode} T
 * @param {(ctx: FormApi<any>) => T} cb
 * @returns {ReactElement}
 */
export const withFormContext = (cb) => (
	<FormContext.Consumer>
		{(ctx) => {
			if (ctx === undefined) {
				throw new Error(OUTSIDE_FORM_ERROR);
			}
			return cb(ctx);
		}}
	</FormContext.Consumer>
);
