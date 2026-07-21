import React, { useContext } from 'react';

/**
 * @import { ReactElement } from 'react'
 * @import { FormattedError, FormChangeEvent } from './helpers'
 */

/**
 * Built-in AJV validation keywords. Listed here so consumers writing
 * `errorMessages` get IDE autocomplete on the well-known keys while still
 * being free to add custom keywords (any other string is accepted via the
 * `ErrorMessagesMap` index signature).
 *
 * @typedef {(
 *   'type' | 'required' | 'enum' | 'const'
 *   | 'minimum' | 'maximum' | 'exclusiveMinimum' | 'exclusiveMaximum'
 *   | 'multipleOf'
 *   | 'minLength' | 'maxLength' | 'pattern' | 'format'
 *   | 'minItems' | 'maxItems' | 'uniqueItems'
 *   | 'minProperties' | 'maxProperties'
 *   | 'additionalProperties' | 'dependencies' | 'patternProperties' | 'properties'
 *   | 'oneOf' | 'anyOf' | 'allOf' | 'not' | 'if' | 'then' | 'else'
 * )} AjvKeyword
 */

/**
 * Builds a single error message string from an AJV error.
 *
 * @typedef {(error: FormattedError) => string} ErrorMessageFn
 */

/**
 * Map of error messages. `defaultMessage` is the catch-all used by
 * `<FieldError>` when no entry matches the error's keyword. The known
 * keywords (see {@link AjvKeyword}) are typed for autocomplete; any other
 * string key (e.g. a custom AJV keyword) is still allowed.
 *
 * The `(string & {})` in the key union is the standard TypeScript trick to
 * accept arbitrary strings *without* collapsing the literal union — plain
 * `string` would erase the autocomplete on the known keywords.
 *
 * @typedef {Partial<Record<
 *   AjvKeyword | 'defaultMessage' | (string & {}),
 *   ErrorMessageFn
 * >>} ErrorMessagesMap
 */

/**
 * @typedef {{
 *   errors: FormattedError[],
 *   isSubmitted: boolean,
 *   touchedFields: string[],
 *   valid: boolean,
 *   errorMessages?: ErrorMessagesMap,
 *   getFieldErrors: (names: string | string[]) => FormattedError[],
 *   handleFieldChange: (event: FormChangeEvent | string, value?: unknown) => void,
 *   isFieldTouched: (names: string | string[]) => boolean,
 *   isFieldInvalid: (names: string | string[]) => boolean,
 *   isTouched: () => boolean,
 *   touch: (names: string | string[]) => void,
 * }} FormContextValue
 */

const FormContext = React.createContext(
	/** @type {FormContextValue | undefined} */ (undefined),
);

export default FormContext;

const OUTSIDE_FORM_ERROR = (
	'react-jsonschema-form-validation: '
	+ 'useFormContext / withFormContext must be used inside a <Form> component.'
);

/** @returns {FormContextValue} */
export const useFormContext = () => {
	const ctx = useContext(FormContext);
	if (ctx === undefined) {
		throw new Error(OUTSIDE_FORM_ERROR);
	}
	return ctx;
};

/**
 * Legacy render-prop helper kept for backward compatibility — prefer
 * `useFormContext()` in new code.
 *
 * @template T
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
