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
 * The coarse, 0.x-like slice of the state: what `useFormContext()` and the
 * form owner (`useForm`) re-render on — everything but the <FieldError>
 * registry, which only the components care about.
 *
 * @param {FormState} state
 */
export const selectFormState = (state) => ({
	valid: state.valid,
	errors: state.errors,
	touchedFields: state.touchedFields,
	isSubmitted: state.isSubmitted,
});

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
	// Primitives (a selector returning a number, a string…) and null: only
	// identity counts — two different numbers have no keys to compare.
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	return keysA.length === keysB.length && keysA.every((key) => Object.is(a[key], b[key]));
};
