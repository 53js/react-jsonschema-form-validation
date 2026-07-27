/**
 * Type-only module. Declares the JSDoc typedefs consumed by the runtime
 * `Context.js` (and by `Field.js` / `FieldError.js` / `Form.js`) — kept
 * separate so that `Context.js` stays a "pure runtime" file. Without this
 * split, `tsc` emits duplicated raw `@typedef` blocks at the end of
 * `Context.d.ts`, which pollutes the bundled `dist/index.d.ts`.
 *
 * Nothing is exported at runtime; the trailing `export {}` marks the file
 * as an ES module so its `@typedef` declarations become exported types.
 *
 * @import { FormattedError, FormChangeEvent } from './helpers'
 */

/**
 * Built-in AJV validation keywords. Listed here so consumers writing
 * `errorMessages` get IDE autocomplete on the well-known keys while still
 * being free to add custom keywords (any other string is accepted via the
 * `(string & {})` intersection in `ErrorMessagesMap`).
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
 * The complete value of the form context, supplied by `<Form>` to all its
 * descendants. The actual context type is `FormContextValue | undefined`
 * (it is `undefined` for any consumer rendered outside a `<Form>`), but
 * `useFormContext()` and `withFormContext()` perform the runtime check
 * so downstream code receives a guaranteed non-`undefined` value.
 *
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

export {};
