/**
 * THROWAWAY SKETCH — not for merge (RFC 0001, "Constraint Validation
 * projection", deferred to v1.x). Proves the pure-subscriber constraint:
 * this file uses only the public `FormApi` surface (`id`, `subscribe`,
 * `getState`) and the DOM, and touches nothing in `core/`.
 *
 * After every state change, projects the form errors into the native
 * constraint validation system: walks `form.elements` of the `<form>`
 * element identified by `form.id` (the DOM is the registry — controls
 * associated through the `form` attribute from a portal are included),
 * matches each control's `name` against `FormError.field`, and calls
 * `setCustomValidity(message)` (empty string to clear). Native inputs then
 * expose `validity.customError`, match `:invalid` / `:user-invalid`, and
 * fire `invalid` events for third-party tooling.
 *
 * @import { FormApi } from '../core/useForm'
 */

import { useEffect } from 'react';

/**
 * @param {FormApi<any>} form
 * @param {HTMLFormElement} element
 */
const project = (form, element) => {
	const { errors } = form.getState();
	Array.from(element.elements).forEach((control) => {
		if (!('setCustomValidity' in control)) return;
		const input = /** @type {HTMLInputElement} */ (control);
		if (!input.name) return;
		const error = errors.find((e) => e.field === input.name);
		input.setCustomValidity(error ? error.message : '');
	});
};

/**
 * @param {FormApi<any>} form
 */
const useConstraintValidity = (form) => {
	useEffect(() => {
		const element = /** @type {HTMLFormElement | null} */ (document.getElementById(form.id));
		if (!element) return undefined;
		project(form, element);
		return form.subscribe(() => project(form, element));
	}, [form]);
};

export default useConstraintValidity;
