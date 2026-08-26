/**
 * Pure selectors over a `FormState` snapshot. Shared by the imperative
 * `FormApi` methods (`getState()` + selector) and by the component-level
 * subscriptions (`useFormSelector(form, selector)`), so both read the exact
 * same derivation.
 *
 * @import { FormState } from './store'
 * @import { FormError } from './errors'
 */

import { filterByFieldNameWithWildcard, toNameList } from './helpers';

/**
 * @param {FormState} state
 * @param {string | string[]} names
 * @returns {FormError[]}
 */
export const selectFieldErrors = (state, names) => toNameList(names).reduce(
	(acc, name) => [...acc, ...filterByFieldNameWithWildcard(state.errors, name)],
	/** @type {FormError[]} */ ([]),
);

/**
 * @param {FormState} state
 * @param {string | string[]} names
 * @returns {boolean}
 */
export const selectIsFieldInvalid = (state, names) => selectFieldErrors(state, names).length > 0;

/**
 * @param {FormState} state
 * @param {string | string[]} names
 * @returns {boolean}
 */
export const selectIsFieldTouched = (state, names) => {
	const touched = state.touchedFields.map((field) => ({ field }));
	return toNameList(names).some((name) => filterByFieldNameWithWildcard(touched, name).length > 0);
};

/**
 * Space-separated IDREF list of the registered `<FieldError>` ids for
 * `name` (mount order), or `undefined` when none is registered — consumed
 * by `<Field>` as its default `aria-describedby`. A registered wildcard
 * (`user.*`) covers every field it matches.
 *
 * @param {FormState} state
 * @param {string} name
 * @returns {string | undefined}
 */
export const selectFieldErrorDescribedBy = (state, name) => {
	const ids = state.fieldErrorRegistry
		.filter((entry) => filterByFieldNameWithWildcard([{ field: name }], entry.name).length > 0)
		.map((entry) => entry.id);
	const uniqueIds = [...new Set(ids)];
	return uniqueIds.length ? uniqueIds.join(' ') : undefined;
};

/**
 * Shallow equality on plain objects — the `isEqual` of the selector-based
 * subscriptions.
 *
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 * @returns {boolean}
 */
export const shallowEqual = (a, b) => {
	if (Object.is(a, b)) return true;
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	return keysA.length === keysB.length && keysA.every((key) => Object.is(a[key], b[key]));
};

/**
 * Two errors are "the same" for display purposes when they target the same
 * field with the same code, message and (shallowly) the same params —
 * validation produces fresh error objects on every run, and comparing by
 * reference would re-render every `<FieldError>` on each keystroke.
 *
 * @param {FormError | undefined} a
 * @param {FormError | undefined} b
 * @returns {boolean}
 */
export const isSameError = (a, b) => {
	if (a === b) return true;
	if (!a || !b) return false;
	return a.field === b.field
		&& a.code === b.code
		&& a.message === b.message
		&& shallowEqual(a.params, b.params);
};
