/**
 * Type-only module: shared JSDoc typedefs of the core (no runtime export).
 *
 * @import { FormError, ErrorCode } from './errors'
 */

/**
 * Builds a single error message string from a normalized error.
 *
 * @typedef {(error: FormError) => string} ErrorMessageFn
 */

/**
 * Map of error messages keyed by error code. `defaultMessage` is the
 * catch-all used by `<FieldError>` when no entry matches. The normalized
 * codes are typed for autocomplete; any other string (a provider-specific
 * code such as AJV's `multipleOf` or a custom keyword) is still accepted.
 *
 * @typedef {Partial<Record<
 *   ErrorCode | 'defaultMessage',
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
 * index signature (`[key: string]: any` — reactstrap and friends):
 * 1. strips the index signature so `Omit` operates on named keys only;
 * 2. re-attaches the original index signature only if `T` really had one
 *    (`string extends keyof T` guard).
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
