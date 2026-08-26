/**
 * Module-private link between a public `FormApi` and the hooks that drive
 * it (`useFormStore`, `<Form>`). Kept out of the `FormApi` type and of the
 * barrel on purpose: consumers never see `bindSubmit` & co.
 *
 * @import { FormBindings } from './useForm'
 * @import { ErrorMessagesMap } from './types'
 */

/**
 * @typedef {{
 *   bindSubmit: (bindings: FormBindings) => void,
 *   revalidate: (data: unknown) => void,
 *   setErrorMessages: (errorMessages: ErrorMessagesMap | undefined) => void,
 *   dispose: () => void,
 * }} FormInternals
 */

/** @type {WeakMap<object, FormInternals>} */
const registry = new WeakMap();

/**
 * @param {object} api
 * @param {FormInternals} internals
 */
export const setInternals = (api, internals) => {
	registry.set(api, internals);
};

/**
 * @param {object} api
 * @returns {FormInternals}
 */
export const getInternals = (api) => {
	const internals = registry.get(api);
	if (!internals) {
		throw new Error('react-jsonschema-form-validation: not a form object created by useForm().');
	}
	return internals;
};
