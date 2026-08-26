import React, { useContext } from 'react';

/**
 * @import { ReactElement, ReactNode } from 'react'
 * @import { FormContextValue } from './Context.types'
 */

/**
 * React context that carries the `<Form>` state down to descendant
 * `<Field>` and `<FieldError>` components. Not intended for direct use —
 * consume it through `useFormContext()` (or the legacy `withFormContext()`
 * render-prop helper), which handles the "outside a Form" case with a
 * descriptive error instead of returning `undefined`.
 */
const FormContext = React.createContext(
	/** @type {FormContextValue | undefined} */ (undefined),
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
 * @returns {FormContextValue}
 */
export const useFormContext = () => {
	const ctx = useContext(FormContext);
	if (ctx === undefined) {
		throw new Error(OUTSIDE_FORM_ERROR);
	}
	return ctx;
};

/**
 * Legacy render-prop helper kept for backward compatibility — prefer
 * `useFormContext()` in new code. Like `useFormContext`, it throws when
 * rendered outside a `<Form>` so the callback always receives a defined
 * context value.
 *
 * @template {ReactNode} T `@types/react` >= 18 types the Consumer render prop as
 *   returning `ReactNode`; the constraint keeps `withFormContext` callbacks
 *   assignable to it without a cast.
 * @param {(ctx: FormContextValue) => T} cb
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
