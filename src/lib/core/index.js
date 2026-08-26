/**
 * Core entry (`react-jsonschema-form-validation/core`): Standard Schema
 * only, no validation provider bundled. Pair it with `providers/ajv`,
 * Zod, Valibot… The root entry re-exports everything here and adds the
 * JSON Schema sugar.
 *
 * Runtime exports are explicit (no hooks-only member leaks: `useFormStore`,
 * `useResolvedForm`, the internals registry stay private). The public
 * types are re-declared below as typedef aliases — a JS module cannot
 * `export type`.
 */
export { default as getFieldErrorId } from '../a11y';
export { default as FormContext, useFormContext, withFormContext } from './Context';
export { default as deepEqual } from './deepEqual';
export {
	assertSyncResult, normalizeIssues, pathToField, runSchema,
} from './errors';
export { default as Field } from './Field';
export { default as FieldError } from './FieldError';
export { default as Form } from './Form';
export { filterByFieldNameWithWildcard, getFieldValue, updateDataFromEvents } from './helpers';
export {
	selectFieldErrorDescribedBy,
	selectFieldErrors,
	selectIsFieldInvalid,
	selectIsFieldTouched,
	shallowEqual,
} from './selectors';
export { isStandardSchema } from './standard-schema';
export { createFormStore } from './store';
export { default as useForm } from './useForm';
export { default as useFormSelector } from './useFormSelector';

/** @import { ElementType } from 'react' */

/** @typedef {import('./errors').FormError} FormError */
/** @typedef {import('./errors').ErrorCode} ErrorCode */
/** @typedef {import('./errors').ProviderIssue} ProviderIssue */
/** @typedef {import('./standard-schema').StandardSchemaIssue} StandardSchemaIssue */
/** @typedef {import('./store').FormState} FormState */
/** @typedef {import('./store').FieldErrorEntry} FieldErrorEntry */
/** @typedef {import('./store').FormStore} FormStore */
/** @typedef {import('./types').ErrorMessageFn} ErrorMessageFn */
/** @typedef {import('./types').ErrorMessagesMap} ErrorMessagesMap */
/** @typedef {import('./types').FormChangeEvent} FormChangeEvent */
/** @typedef {import('./types').FormInputTarget} FormInputTarget */
/** @typedef {import('./useForm').JfvScrollOptions} JfvScrollOptions */
/** @typedef {import('./Form').FormSharedProps} FormSharedProps */
/** @typedef {import('./Field').FieldBaseProps} FieldBaseProps */
/** @typedef {import('./Field').FieldChangeHandler} FieldChangeHandler */
/** @typedef {import('./FieldError').FieldErrorBaseProps} FieldErrorBaseProps */

/**
 * @template [T = Record<string, unknown>]
 * @typedef {import('./useForm').FormApi<T>} FormApi
 */

/**
 * @template [T = Record<string, unknown>]
 * @typedef {import('./useForm').UseFormConfig<T>} UseFormConfig
 */

/**
 * @template [T = Record<string, unknown>]
 * @typedef {import('./Form').FormConfigProps<T>} FormConfigProps
 */

/**
 * @template [T = Record<string, unknown>]
 * @template {ElementType} [C = 'form']
 * @typedef {import('./Form').FormHookModeProps<T, C>} FormHookModeProps
 */

/**
 * @template [T = Record<string, unknown>]
 * @template {ElementType} [C = 'form']
 * @typedef {import('./Form').FormSugarModeProps<T, C>} FormSugarModeProps
 */

/**
 * @template [T = Record<string, unknown>]
 * @template {ElementType} [C = 'form']
 * @typedef {import('./Form').FormProps<T, C>} FormProps
 */

/**
 * @template {ElementType} [C = 'input']
 * @typedef {import('./Field').FieldProps<C>} FieldProps
 */

/**
 * @template {ElementType} [C = 'div']
 * @typedef {import('./FieldError').FieldErrorProps<C>} FieldErrorProps
 */

/**
 * @template T
 * @template {PropertyKey} K
 * @typedef {import('./types').SafePropsOmit<T, K>} SafePropsOmit
 */

/**
 * @template Output
 * @typedef {import('./standard-schema').StandardSchemaResult<Output>} StandardSchemaResult
 */

/**
 * @template [Input = unknown]
 * @template [Output = Input]
 * @typedef {import('./standard-schema').StandardSchemaProps<Input, Output>
 * } StandardSchemaProps
 */

/**
 * @template [Input = unknown]
 * @template [Output = Input]
 * @typedef {import('./standard-schema').StandardSchema<Input, Output>} StandardSchema
 */
