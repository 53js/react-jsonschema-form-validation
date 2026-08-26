/**
 * @import { FormError } from './errors'
 */

/**
 * One mounted `<FieldError>`: its stable instance key, the field name it
 * targets and the DOM id it renders. Kept in mount order so the IDREF
 * list built for `aria-describedby` is deterministic.
 *
 * @typedef {{ key: string, name: string, id: string }} FieldErrorEntry
 */

/**
 * Immutable snapshot consumed by every subscriber (`useForm`, `<Field>`,
 * `<FieldError>`, and any external pure subscriber such as a Constraint
 * Validation projection). Everything a component may *read reactively*
 * lives here; configuration only read by the imperative API stays outside
 * (see `useForm`).
 *
 * @typedef {{
 *   valid: boolean,
 *   errors: FormError[],
 *   touchedFields: string[],
 *   isSubmitted: boolean,
 *   fieldErrorRegistry: FieldErrorEntry[],
 * }} FormState
 */

/**
 * @typedef {{
 *   getState: () => FormState,
 *   setState: (partial: Partial<FormState> | ((state: FormState) => Partial<FormState>)) => void,
 *   subscribe: (listener: () => void) => () => void,
 * }} FormStore
 */

/**
 * Minimal external store (`subscribe` / `getState` / `setState`), the shape
 * `useSyncExternalStore` expects. `setState` merges shallowly and only
 * notifies when at least one key actually changed (reference equality),
 * so redundant updates never reach React.
 *
 * @param {FormState} initialState
 * @returns {FormStore}
 */
// eslint-disable-next-line import/prefer-default-export
export const createFormStore = (initialState) => {
	let state = initialState;
	/** @type {Set<() => void>} */
	const listeners = new Set();

	return {
		getState: () => state,
		setState: (partial) => {
			const next = typeof partial === 'function' ? partial(state) : partial;
			const keys = /** @type {(keyof FormState)[]} */ (Object.keys(next));
			if (keys.every((key) => next[key] === state[key])) return;
			state = { ...state, ...next };
			listeners.forEach((listener) => listener());
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
};
