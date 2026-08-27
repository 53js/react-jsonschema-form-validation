/**
 * Provider-agnostic helpers of the core: field matching, DOM value
 * extraction and immutable data updates. Nothing here knows about JSON
 * Schema or AJV.
 *
 * @import { FormInputTarget, FormChangeEvent } from './types'
 */

import { setIn } from './setIn';

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
			return e.field !== undefined && regex.test(e.field);
		}
		return e.field === fieldName;
	});
};

/**
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
	const { files } = /** @type {{ files: FileList; multiple?: boolean }} */ (target);
	return target.multiple ? Array.from(files) : files[0];
};

/**
 * Reads a number from a numeric input. Returns the empty string when the
 * input is empty so a `required` constraint can flag it.
 *
 * @param {FormInputTarget} target
 * @returns {number | ''}
 */
export const getInputNumberValue = (target) => (target.value !== '' ? +target.value : '');

/**
 * Returns a value from any type of input (text, checkbox, file...)
 *
 * @param {FormInputTarget} target
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
 * Returns a copy of `data` with the field paths described by `events`
 * updated to their new values (structural sharing via {@link setIn}).
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
		data = setIn(data, event.target.name, getFieldValue(event.target));
	});

	return data;
};

/**
 * @param {string | string[]} names
 * @returns {string[]}
 */
export const toNameList = (names) => (Array.isArray(names) ? names : [names]);
