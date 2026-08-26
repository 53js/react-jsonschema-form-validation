/**
 * JSON Schema / AJV helpers of the provider: default instance, empty-value
 * normalization and AJV error paths. Internal to `providers/ajv` — only
 * `createAjv` is part of the public subpath.
 *
 * @import { ErrorObject } from 'ajv'
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * An AJV `ErrorObject` enriched with a `field` property — the dot-path of
 * the offending field. Because {@link createAjv} enables AJV's `verbose`
 * option (issue #6), errors also carry `data` (the current value of the
 * offending field), `schema` and `parentSchema`. `dataPath` is declared for
 * legacy AJV 6 error objects, which {@link formatErrors} still accepts.
 *
 * @typedef {ErrorObject & { dataPath?: string, field: string }} FormattedError
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
 * `verbose: true` (issue #6) makes AJV attach `data`, `schema` and
 * `parentSchema` to every error, so `errorMessages` callbacks can
 * interpolate the current value of the offending field (`error.data`).
 *
 * @returns {Ajv}
 */
export const createAjv = () => {
	const ajv = new Ajv({
		allErrors: true,
		$data: true,
		strict: false,
		// Issue #6: expose the offending value to `errorMessages` callbacks.
		// For value-level keywords (minLength, format, enum, const — including
		// `$data` references) `error.data` is the current field value; for
		// `required` it is the *parent object* missing the property (AJV
		// reports `required` on the parent, the missing value itself does
		// not exist). `error.schema` is the failing keyword's value and
		// `error.parentSchema` the enclosing subschema.
		verbose: true,
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
 * Splits a JSON Pointer (RFC 6901, the shape of AJV 8's `error.instancePath`,
 * e.g. `'/items/0/label'`) into its decoded reference tokens
 * (`['items', '0', 'label']`). The root pointer `''` yields no segment.
 *
 * @param {string} pointer
 * @returns {string[]}
 */
export const pointerToSegments = (pointer) => pointer
	.split('/')
	.slice(1)
	.map(unescapePointerSegment);

/**
 * Converts a JSON Pointer into the library's dot-separated field path
 * (`'items.0.label'`). The root pointer `''` maps to the empty field path `''`.
 *
 * @param {string} pointer
 * @returns {string}
 */
export const pointerToFieldPath = (pointer) => pointerToSegments(pointer).join('.');

/**
 * Converts a legacy AJV 6 `error.dataPath` (dot notation with bracketed
 * array indexes, e.g. `'.items[0].label'`) into the library's dot-separated
 * field path (`'items.0.label'`).
 *
 * @param {string} dataPath
 * @returns {string}
 */
export const dataPathToFieldPath = (dataPath) => dataPath
	.replace(/^\./, '')
	.replace(/\[([0-9]+)\]/g, '.$1');

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
		formatted.field = dataPathToFieldPath(formatted.dataPath ?? '');
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
