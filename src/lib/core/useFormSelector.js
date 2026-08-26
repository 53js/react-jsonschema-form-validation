import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';

import { shallowEqual } from './selectors';

/**
 * @import { FormApi } from './useForm'
 * @import { FormState } from './store'
 */

/**
 * Subscribes a component to a slice of the form state. The component only
 * re-renders when `selector(state)` changes according to `isEqual`
 * (shallow by default) — the per-field granularity `<Field>` and
 * `<FieldError>` rely on (RFC 0001, "Subscription model").
 *
 * @template Selection
 * @param {FormApi<any>} form
 * @param {(state: FormState) => Selection} selector
 * @param {(a: Selection, b: Selection) => boolean} [isEqual]
 * @returns {Selection}
 */
const useFormSelector = (form, selector, isEqual) => useSyncExternalStoreWithSelector(
	form.subscribe,
	form.getState,
	form.getState,
	selector,
	isEqual || /** @type {(a: Selection, b: Selection) => boolean} */ (
		/** @type {unknown} */ (shallowEqual)
	),
);

export default useFormSelector;
