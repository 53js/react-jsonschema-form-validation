/**
 * @import { ErrorObject } from 'ajv'
 */

import Ajv from 'ajv';
import immutable from 'dot-prop-immutable';

/**
 * An AJV `ErrorObject` enriched with a `field` property — a normalized,
 * dot-separated path to the offending field (e.g. `'user.email'` or
 * `'items.0.label'`). Used everywhere internally to locate the input
 * associated with an error.
 *
 * @typedef {ErrorObject & { field: string }} FormattedError
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
 * Returns a default AJV instance configured for use with the form.
 *
 * @returns {Ajv.Ajv}
 */
export const createAjv = () => new Ajv(
	// Cast: the `v5` option no longer exists in AJV 6+ typings (it was a
	// flag from AJV 3/4 that enabled draft-05 features, which became the
	// default later). The runtime silently ignores unknown options. Kept
	// here verbatim from the historical code so the lib stays byte-for-byte
	// equivalent (notably for the Form snapshot test that captures AJV's
	// internal `_opts` / `_metaOpts` state).
	/** @type {Ajv.Options} */ ({
		allErrors: true,
		v5: true,
		$data: true,
	}),
);

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
 * Enriches each AJV error with a normalized `field` path. The transformation
 * is in-place — it mutates the original AJV `ErrorObject`, which is consistent
 * with the library's existing behavior (errors come from AJV and are
 * disposable between two runs).
 *
 * @param {ErrorObject[] | null | undefined} errors
 * @returns {FormattedError[]}
 */
export const formatErrors = (errors) => (errors || []).map((error) => {
	const formatted = /** @type {FormattedError} */ (error);
	formatted.field = formatted.dataPath;

	if (formatted.keyword === 'required') {
		// AJV's `required` errors carry the missing key in `params.missingProperty`.
		const { params } = formatted;
		const { missingProperty } = /** @type {{ missingProperty: string }} */ (params);
		formatted.field = `${formatted.field}.${missingProperty}`;
	}

	formatted.field = formatted.field
		.replace(/^\./, '')
		.replace(/\[([0-9]+)\]/, '.$1');

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
		regex = new RegExp(`^${fieldName.replace(/\*$/, '')}`);
	}

	return fields.filter((e) => {
		if (regex) {
			// Cast: TS sees `e.field` as `string | undefined`. The original
			// code passes it to `regex.test()` verbatim — when `field` is
			// undefined JS coerces it to the literal string `"undefined"`.
			// Preserved as-is for exact runtime parity.
			return regex.test(/** @type {string} */ (e.field));
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
