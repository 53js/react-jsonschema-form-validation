export { default as getFieldErrorId } from './a11y';
export { default as Field } from './Field';
export { default as FieldError } from './FieldError';
export * from './Form';
export { default, default as Form } from './Form';

// Public type surface, re-declared here so the per-file `.d.ts` build keeps
// exporting from the root exactly what the former bundled `index.d.ts`
// hoisted, plus the Standard Schema groundwork types (RFC 0001). A JS
// module cannot `export type`; a JSDoc typedef aliasing an `import()` type
// is the equivalent. Runtime surface unchanged: the core protocol
// functions stay internal until the `/core` entry lands with `useForm`,
// and the AJV provider lives on its own subpath
// (`react-jsonschema-form-validation/providers/ajv`) so consumers of other
// Standard Schema providers never bundle AJV.

/** @import { ElementType } from 'react' */

/** @typedef {import('./Form/Context.types').AjvKeyword} AjvKeyword */
/** @typedef {import('./Form/Context.types').ErrorMessageFn} ErrorMessageFn */
/** @typedef {import('./Form/Context.types').ErrorMessagesMap} ErrorMessagesMap */
/** @typedef {import('./Form/Context.types').FormContextValue} FormContextValue */
/** @typedef {import('./Form/helpers').FormattedError} FormattedError */
/** @typedef {import('./Form/helpers').FormChangeEvent} FormChangeEvent */
/** @typedef {import('./Form/helpers').FormInputTarget} FormInputTarget */
/** @typedef {import('./Form/Form').FormBaseProps} FormBaseProps */
/** @typedef {import('./Form/Form').JfvScrollOptions} JfvScrollOptions */
/** @typedef {import('./Field/Field').FieldBaseProps} FieldBaseProps */
/** @typedef {import('./Field/Field').FieldChangeHandler} FieldChangeHandler */
/** @typedef {import('./FieldError/FieldError').FieldErrorBaseProps} FieldErrorBaseProps */

/** @typedef {import('./core/errors').FormError} FormError */
/** @typedef {import('./core/errors').ErrorCode} ErrorCode */
/** @typedef {import('./core/errors').ProviderIssue} ProviderIssue */
/** @typedef {import('./core/standard-schema').StandardSchemaIssue} StandardSchemaIssue */

/**
 * @template T
 * @template {PropertyKey} K
 * @typedef {import('./Form/helpers').SafePropsOmit<T, K>} SafePropsOmit
 */

/**
 * @template [T = Record<string, unknown>]
 * @template {ElementType} [C = 'form']
 * @typedef {import('./Form/Form').FormProps<T, C>} FormProps
 */

/**
 * @template {ElementType} [C = 'input']
 * @typedef {import('./Field/Field').FieldProps<C>} FieldProps
 */

/**
 * @template {ElementType} [C = 'div']
 * @typedef {import('./FieldError/FieldError').FieldErrorProps<C>} FieldErrorProps
 */

/**
 * @template Output
 * @typedef {import('./core/standard-schema').StandardSchemaResult<Output>} StandardSchemaResult
 */

/**
 * @template [Input = unknown]
 * @template [Output = Input]
 * @typedef {import('./core/standard-schema').StandardSchemaProps<Input, Output>
 * } StandardSchemaProps
 */

/**
 * @template [Input = unknown]
 * @template [Output = Input]
 * @typedef {import('./core/standard-schema').StandardSchema<Input, Output>} StandardSchema
 */
