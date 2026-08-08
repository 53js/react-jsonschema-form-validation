/**
 * @import { ErrorObject } from 'ajv'
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import immutable from 'dot-prop-immutable';

/**
 * An AJV `ErrorObject` enriched with a `field` property — a normalized,
 * dot-separated path to the offending field (e.g. `'user.email'` or
 * `'items.0.label'`). Used everywhere internally to locate the input
 * associated with an error.
 *
 * `dataPath` is declared here because the bundled AJV 8 typings only
 * know `instancePath`; legacy AJV 6 errors carry `dataPath` instead, and
 * {@link formatErrors} accepts both shapes.
 *
 * @typedef {ErrorObject & { dataPath?: string, field: string }} FormattedError
 */

/**
 * Minimal shape required by the library on an input target. Structurally
 * compatible with `HTMLInputElement`, `HTMLTextAreaElement`, `HTMLSelectElement`
 * and any custom object that mimics them (e.g. when an integration like
 * `react-select` synthesizes its own events). Only the properties actually
 * read by the library appear here.
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
 * Lightweight change event accepted by the form. Any DOM `ChangeEvent`
 * or `InputEvent` is structurally compatible with this shape, so users can
 * forward native React events without casting.
 *
 * @typedef {{ target: FormInputTarget }} FormChangeEvent
 */

/**
 * Internal `Omit` variant that keeps typed keys strict even when `T` has an
 * index signature (like `[key: string]: any` — reactstrap and a few other
 * libraries expose these). Standard `Omit<T, K>` on such a type collapses
 * the typed keys back into `any` through the index, which effectively kills
 * the polymorphic type-checking on `<Field component={X} .../>` etc.
 *
 * This variant:
 *  1. Strips the index signature so `Omit` can operate on named keys only,
 *     keeping their precise types.
 *  2. Only re-attaches the original index signature (with its original
 *     value type) *if T actually had one to begin with*. The `string
 *     extends keyof T` guard prevents accidentally re-injecting an index
 *     signature on plain "record-like" types whose values happen to share
 *     a common supertype (e.g. `{ label: string; flavor: 'a' | 'b' }`
 *     structurally extends `{ [k: string]: string }` but does not really
 *     accept arbitrary keys).
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

/**
 * Returns a default AJV (v8) instance configured for use with the form:
 * - `allErrors` — report every error, not just the first one, so all
 *   invalid fields can be highlighted at once;
 * - `$data` — enable `$data` references (e.g. password confirmation via
 *   `const: { $data: '1/password' }`);
 * - `strict: false` — keep AJV 6's permissive behavior: schemas with
 *   unknown keywords or loose patterns compile instead of throwing.
 *   Pass your own instance via the `ajv` prop for strict mode;
 * - `ajv-formats` — restore the string formats (`email`, `date`, `uri`…)
 *   that AJV 8 moved out of the core package.
 *
 * @returns {Ajv}
 */
export const createAjv = () => {
	const ajv = new Ajv({
		allErrors: true,
		$data: true,
		strict: false,
	});
	addFormats(ajv);
	return ajv;
};

/**
 * Normalizes empty form values. Returns `undefined` for `''` and `null`
 * so that AJV's `required` keyword treats them as missing (which is what
 * a form usually expects), and returns the value untouched otherwise.
 *
 * @template T
 * @param {T} value
 * @returns {T | undefined}
 */
export const empty = (value) => {
	// Cast: TS strict refuses `value === ''` / `=== null` when `value` is a
	// generic `T` and the literal isn't part of T's domain. We compare via
	// an `unknown` view of the same reference; the runtime is unchanged.
	const v = /** @type {unknown} */ (value);
	return v === '' || v === null ? undefined : value;
};

/**
 * Recursively walks `data` and applies `empty()` to every leaf value.
 * Returns a new object/array if anything changes, never mutates the input.
 * Primitives equal to `''` or `null` collapse to `undefined`, hence the
 * `T | undefined` return type.
 *
 * @template T
 * @param {T} data
 * @returns {T | undefined}
 */
export const formatData = (data) => {
	if (Array.isArray(data)) {
		// Cast: `data.map(formatData)` is structurally an array of the same
		// item type as `data` itself, but TS can't track that through the
		// generic boundary — the runtime is unchanged.
		return /** @type {T} */ (data.map(formatData));
	}

	if (data !== null && typeof data === 'object') {
		/** @type {Record<string, unknown>} */
		const copy = {}; // Do not modify original object !
		// Cast: we just narrowed `data` to a non-null object, but TS still
		// sees it as the generic `T`. The cast lets us iterate inherited
		// keys via `for...in` (intentional for host objects like `File`
		// whose `name` lives on the prototype chain).
		const obj = /** @type {Record<string, unknown>} */ (data);
		// eslint-disable-next-line no-restricted-syntax, guard-for-in
		for (const key in obj) {
			copy[key] = formatData(obj[key]);
		}
		return /** @type {T} */ (copy);
	}

	return empty(data);
};

/**
 * Decodes a single JSON Pointer reference token (RFC 6901 §4).
 *
 * The order of the two replacements is mandated by the RFC: `~1` must be
 * decoded before `~0`, otherwise the escaped sequence `~01` (which encodes
 * the literal string `~1`) would first collapse to `~` + `1` and then be
 * wrongly re-decoded as `/`.
 *
 * @param {string} segment
 * @returns {string}
 */
const unescapePointerSegment = (segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~');

/**
 * Converts a JSON Pointer (RFC 6901, the shape of AJV 8's
 * `error.instancePath`, e.g. `'/items/0/label'`) into the library's
 * dot-separated field path (`'items.0.label'`). The root pointer `''`
 * maps to the empty field path `''`.
 *
 * @param {string} pointer
 * @returns {string}
 */
export const pointerToFieldPath = (pointer) => pointer
	.split('/')
	.slice(1)
	.map(unescapePointerSegment)
	.join('.');

/**
 * Enriches each AJV error with a normalized `field` path. The transformation
 * is in-place — it mutates the original AJV `ErrorObject`, which is consistent
 * with the library's existing behavior (errors come from AJV and are
 * disposable between two runs).
 *
 * Accepts both AJV error shapes: when `error.instancePath` is present
 * (a JSON Pointer, AJV 8+) it takes precedence; otherwise the legacy
 * `error.dataPath` (dot/bracket notation, AJV ≤ 6) is used. The library
 * bundles AJV 8, so the `instancePath` branch is the active one — the
 * `dataPath` fallback is a soft landing for consumers who still inject a
 * custom AJV 6 instance via the `ajv` prop (scheduled for removal in the
 * final 1.0) and is a building block for a future Standard Schema adapter.
 *
 * @param {ErrorObject[] | null | undefined} errors
 * @returns {FormattedError[]}
 */
export const formatErrors = (errors) => (errors || []).map((error) => {
	const formatted = /** @type {FormattedError} */ (error);

	if (typeof formatted.instancePath === 'string') {
		// AJV 8 shape: JSON Pointer.
		formatted.field = pointerToFieldPath(formatted.instancePath);
	} else {
		// AJV 6 shape: dot notation with bracketed array indexes. A
		// degenerate error carrying neither `instancePath` nor `dataPath`
		// is treated as pointing at the root instead of crashing.
		formatted.field = (formatted.dataPath ?? '')
			.replace(/^\./, '')
			.replace(/\[([0-9]+)\]/g, '.$1');
	}

	if (formatted.keyword === 'required' && 'missingProperty' in formatted.params) {
		// AJV's `required` errors carry the missing key in `params.missingProperty`.
		// At the root the field path is empty: the missing key alone is the path
		// (no leading dot to strip since normalization already happened above).
		formatted.field = formatted.field
			? `${formatted.field}.${formatted.params.missingProperty}`
			: formatted.params.missingProperty;
	}

	return formatted;
});

/**
 * Filters an array of items by their `field` property. The expression can be:
 * - a literal name (e.g. `'email'`) — exact match
 * - or a prefix ending with `*` (e.g. `'user.*'`) — startsWith match
 *
 * @template {{ field?: string }} T
 * @param {T[]} fields
 * @param {string} fieldName
 * @returns {T[]}
 */
export const filterByFieldNameWithWildcard = (fields, fieldName) => {
	/** @type {RegExp | undefined} */
	let regex;
	if (/\*$/.test(fieldName)) {
		// Escape regex metacharacters so a prefix like `user.` matches the
		// literal dot instead of any character (`user.*` must not match `userX`).
		const prefix = fieldName.replace(/\*$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		regex = new RegExp(`^${prefix}`);
	}

	return fields.filter((e) => {
		if (regex) {
			// `e.field !== undefined` short-circuits the test() call.
			// In practice the lib never feeds `undefined` here (errors and
			// touchedFields always carry a string field).
			return e.field !== undefined && regex.test(e.field);
		}
		return e.field === fieldName;
	});
};

/**
 * Reads the checkbox state. If a checkbox is used to build an array of
 * selected values, you must supply a custom `onChange` to handle it.
 *
 * @param {FormInputTarget} target
 * @returns {boolean | undefined}
 */
export const getInputCheckboxValue = (target) => target.checked;

/**
 * Reads a file, a list of files (when `multiple`) or the raw value when
 * the input is empty.
 *
 * @param {FormInputTarget} target
 * @returns {string | File | File[]}
 */
export const getInputFileValue = (target) => {
	if (target.value === '') return target.value;
	// Cast on `target`: TS sees `target.files` as `FileList | null`, but the
	// original code accesses it unconditionally — on a real
	// `<input type="file">` the browser guarantees it is a `FileList`.
	// Preserved as-is for exact runtime parity.
	const { files } = /** @type {{ files: FileList; multiple?: boolean }} */ (target);
	return target.multiple ? Array.from(files) : files[0];
};

/**
 * Reads a number from a numeric input. Returns the empty string when the
 * input is empty so the JSON Schema `required` keyword can flag it.
 *
 * @param {FormInputTarget} target
 * @returns {number | ''}
 */
export const getInputNumberValue = (target) => (target.value !== '' ? +target.value : '');

/**
 * Returns a value from any type of input (text, checkbox, file...)
 *
 * @param {FormInputTarget} target - A target object from an event (ex: change)
 * @returns {unknown}
 */
export const getFieldValue = (target) => {
	switch (target.type) {
	case 'number':
		return getInputNumberValue(target);
	case 'checkbox':
		return getInputCheckboxValue(target);
	case 'file':
		return getInputFileValue(target);
	default:
		return target.value;
	}
};

/**
 * Returns a copy of `data` with the field paths described by `events` updated
 * to their new values. Uses `dot-prop-immutable` so that only the modified
 * branches of the object tree get new references; untouched siblings keep
 * their identity (useful for `React.memo` / `PureComponent`).
 *
 * @template {object} T
 * @param {T} data
 * @param {FormChangeEvent | FormChangeEvent[]} [events]
 * @returns {T}
 */
export const updateDataFromEvents = (data, events) => {
	if (!events) return data;
	const eventsArray = Array.isArray(events) ? events : [events];

	eventsArray.forEach((event) => {
		data = immutable.set(data, event.target.name, getFieldValue(event.target));
	});

	return data;
};
