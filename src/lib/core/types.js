/**
 * Type-only module: shared JSDoc typedefs of the core (no runtime export).
 *
 * @import { FormError } from './errors'
 */

/**
 * Normalized error-code core (RFC 0001). Providers map their own codes
 * into it; anything unmapped passes through as-is (documented boundary:
 * `oneOf`/`anyOf`, `multipleOf`, `uniqueItems`, `minItems`/`maxItems`,
 * `const`, `additionalProperties` keep the provider's code).
 *
 * @typedef {(
 *   'required' | 'type' | 'min' | 'max' | 'minLength' | 'maxLength'
 *   | 'pattern' | 'format' | 'enum'
 * )} ErrorCode
 */

/**
 * Builds a single error message string from a normalized error.
 *
 * @typedef {(error: FormError) => string} ErrorMessageFn
 */

/**
 * Map of error messages keyed by error code. `defaultMessage` is the
 * catch-all used by `<FieldError>` when no entry matches. Known codes are
 * typed for autocomplete; any other string (a provider-specific code such
 * as AJV's `multipleOf` or a custom keyword) is still accepted through the
 * `(string & {})` member.
 *
 * @typedef {Partial<Record<
 *   ErrorCode | 'defaultMessage' | (string & {}),
 *   ErrorMessageFn
 * >>} ErrorMessagesMap
 */

/**
 * Minimal shape required by the library on an input target. Structurally
 * compatible with `HTMLInputElement`, `HTMLTextAreaElement`,
 * `HTMLSelectElement` and any custom object that mimics them.
 *
 * @typedef {{
 *   name: string,
 *   value: string,
 *   type?: string,
 *   checked?: boolean,
 *   files?: FileList | null,
 *   multiple?: boolean,
 * }} FormInputTarget
 */

/**
 * Lightweight change event accepted by the form. Any DOM `ChangeEvent` is
 * structurally compatible with this shape.
 *
 * @typedef {{ target: FormInputTarget }} FormChangeEvent
 */

/**
 * Internal `Omit` variant that keeps typed keys strict even when `T` has an
 * index signature (`[key: string]: any` — reactstrap and friends). See the
 * 0.x helpers for the full rationale.
 *
 * @template T
 * @template {PropertyKey} K
 * @typedef {(
 *   Omit<{ [P in keyof T as string extends P ? never : P]: T[P] }, K>
 *   & (string extends keyof T
 *     ? (T extends { [k: string]: infer V } ? { [k: string]: V } : {})
 *     : {})
 * )} SafePropsOmit
 */

export {};
