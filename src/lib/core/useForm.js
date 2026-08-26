/**
 * @import { FormEvent } from 'react'
 * @import { StandardSchema } from './standard-schema'
 * @import { FormError } from './errors'
 * @import { FormState } from './store'
 * @import { ErrorMessagesMap, FormChangeEvent } from './types'
 * @import { ThrottledFunc } from './throttle'
 */

import {
	useEffect,
	useId,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';

import { runSchema } from './errors';
import { updateDataFromEvents } from './helpers';
import {
	selectFieldErrorDescribedBy,
	selectFieldErrors,
	selectIsFieldInvalid,
	selectIsFieldTouched,
} from './selectors';
import { createFormStore } from './store';
import throttle from './throttle';

/**
 * Options controlling how the form scrolls to the first invalid field on
 * a failed submit. Forwarded to the native `element.scrollIntoView()`; the
 * legacy `align` option maps to `block`, `offset`/`duration`/`ease` are
 * accepted but ignored (see the 0.x documentation).
 *
 * @typedef {{
 *   behavior?: ScrollBehavior,
 *   block?: ScrollLogicalPosition,
 *   inline?: ScrollLogicalPosition,
 *   align?: 'top' | 'middle' | 'bottom' | (string & {}),
 *   offset?: number,
 *   duration?: number,
 *   ease?: string,
 * }} JfvScrollOptions
 */

/**
 * Validation configuration — declared in `useForm()` (hook mode) or as
 * props of `<Form>` (sugar mode, which forwards them to its internal
 * `useForm`).
 *
 * - `schema`   — any Standard Schema v1 object (Zod, Valibot, ArkType… or
 *                `ajvSchema(jsonSchema)` from `providers/ajv`).
 * - `data`     — current form values, fully controlled by the parent.
 * - `onChange` — called with the updated data on every field change.
 * - `id`       — effective form id (default: React `useId()`), rendered on
 *                the `<form>` element and used to derive every ARIA id.
 *                Fixed at mount: a later change is ignored.
 *
 * @template [T = Record<string, unknown>]
 * @typedef {{
 *   schema: StandardSchema,
 *   data?: T,
 *   onChange?: ((data: T, event?: FormChangeEvent) => void) | null,
 *   errorMessages?: ErrorMessagesMap,
 *   throttleDuration?: number,
 *   id?: string,
 * }} UseFormConfig
 */

/**
 * Submit-time behavior, owned by `<Form>` (shared by both modes) and bound
 * into the api each render. Internal.
 *
 * @typedef {{
 *   onSubmit?: (event: FormEvent) => void,
 *   resetOnSubmit?: boolean,
 *   scrollToError?: boolean,
 *   scrollOptions?: JfvScrollOptions,
 * }} FormBindings
 */

/**
 * The form object returned by `useForm()` and provided through the
 * context. Referentially stable for the lifetime of the component; the
 * reactive members are getters over the current store snapshot (always
 * current, in render as in event handlers — re-rendering is guaranteed by
 * the subscription `useForm` holds).
 *
 * @template [T = Record<string, unknown>]
 * @typedef {{
 *   readonly valid: boolean,
 *   readonly errors: FormError[],
 *   readonly touchedFields: string[],
 *   readonly isSubmitted: boolean,
 *   readonly errorMessages: ErrorMessagesMap | undefined,
 *   readonly id: string,
 *   subscribe: (listener: () => void) => () => void,
 *   getState: () => FormState,
 *   reset: () => void,
 *   checkValidity: () => boolean,
 *   reportValidity: () => boolean,
 *   requestSubmit: () => void,
 *   handleSubmit: (event: FormEvent) => void,
 *   getFieldErrors: (names: string | string[]) => FormError[],
 *   isFieldInvalid: (names: string | string[]) => boolean,
 *   isFieldTouched: (names: string | string[]) => boolean,
 *   isTouched: () => boolean,
 *   touch: (names: string | string[]) => void,
 *   handleFieldChange: (event: FormChangeEvent | string, value?: unknown) => void,
 *   getFieldErrorDescribedBy: (name: string) => string | undefined,
 *   registerFieldError: (key: string, name: string, id: string) => void,
 *   unregisterFieldError: (key: string) => void,
 *   bindSubmit: (bindings: FormBindings) => void,
 *   revalidate: (data: T | undefined) => void,
 *   setErrorMessages: (errorMessages: ErrorMessagesMap | undefined) => void,
 *   dispose: () => void,
 * }} FormApi
 */

const DEFAULT_THROTTLE_DURATION = 200;
/** @type {Record<string, unknown>} */
const DEFAULT_DATA = {};

/** @type {Record<string, ScrollLogicalPosition>} */
const ALIGN_TO_BLOCK = {
	top: 'start',
	middle: 'center',
	bottom: 'end',
};

/**
 * Builds the api around a fresh store. `getConfig` reads the latest
 * configuration (a ref updated on every render of the owning component):
 * `data`, `onChange`, `schema`… are never captured, so the api can stay
 * referentially stable.
 *
 * @template T
 * @param {string} id
 * @param {() => UseFormConfig<T>} getConfig
 * @returns {FormApi<T>}
 */
const createFormApi = (id, getConfig) => {
	const initialConfig = getConfig();
	// First validation is synchronous: the very first render already sees
	// the right `valid` / `errors` (no flash of a wrongly enabled button).
	const store = createFormStore({
		...runSchema(initialConfig.schema, initialConfig.data ?? DEFAULT_DATA),
		touchedFields: [],
		isSubmitted: false,
		fieldErrorRegistry: [],
		errorMessages: initialConfig.errorMessages,
	});

	/** @type {FormBindings} */
	let bindings = {};
	/** @type {ThrottledFunc<(data: unknown) => void> | null} */
	let throttled = null;
	let throttledDuration = -1;

	/** @param {unknown} data */
	const validateNow = (data) => {
		const result = runSchema(getConfig().schema, data);
		store.setState(result);
		return result.valid;
	};

	const getThrottledValidator = () => {
		const duration = getConfig().throttleDuration ?? DEFAULT_THROTTLE_DURATION;
		if (!throttled || duration !== throttledDuration) {
			if (throttled) throttled.cancel();
			throttled = throttle(validateNow, duration);
			throttledDuration = duration;
		}
		return throttled;
	};

	const scrollToFirstError = () => {
		const firstError = store.getState().errors[0];
		if (!firstError) return;
		const element = document.getElementsByName(firstError.field)[0];
		if (!element) return;
		const {
			align,
			behavior = 'smooth',
			block = (align && ALIGN_TO_BLOCK[align]) || 'center',
			inline = 'nearest',
		} = bindings.scrollOptions || {};
		if (typeof element.scrollIntoView === 'function') {
			element.scrollIntoView({ behavior, block, inline });
		}
		element.focus({ preventScroll: true });
	};

	/** @type {FormApi<T>} */
	const api = {
		get valid() { return store.getState().valid; },
		get errors() { return store.getState().errors; },
		get touchedFields() { return store.getState().touchedFields; },
		get isSubmitted() { return store.getState().isSubmitted; },
		get errorMessages() { return store.getState().errorMessages; },
		id,
		subscribe: store.subscribe,
		getState: store.getState,

		reset: () => {
			// Presentation state only: `errors` / `valid` keep describing the
			// current `data` (RFC 0001 decision — 0.x reset them to
			// `[]` / `true` without revalidating).
			store.setState({ touchedFields: [], isSubmitted: false });
		},

		checkValidity: () => {
			if (throttled) throttled.cancel();
			return validateNow(getConfig().data ?? DEFAULT_DATA);
		},

		reportValidity: () => {
			const valid = api.checkValidity();
			store.setState({ isSubmitted: true });
			if (!valid) {
				/* istanbul ignore next -- @preserve */
				if (typeof process !== 'undefined' && process?.env?.REACT_APP_JFV_DEBUG === 'true') {
					console.log(store.getState().errors); // eslint-disable-line no-console
				}
				if (bindings.scrollToError !== false) scrollToFirstError();
			}
			return valid;
		},

		requestSubmit: () => {
			const element = /** @type {HTMLFormElement | null} */ (document.getElementById(id));
			if (!element || typeof element.requestSubmit !== 'function') {
				throw new Error(
					// Concatenation: a `"${…}"` inside a template literal crashes the
					// template-curly-spacing rule under babel-eslint 10 / ESLint 6.
					'react-jsonschema-form-validation: requestSubmit() needs a mounted <Form> (id "'.concat(id, '").'),
				);
			}
			// Native submission path: fires the `submit` event, which reaches
			// `handleSubmit` through the <form> onSubmit handler.
			element.requestSubmit();
		},

		handleSubmit: (event) => {
			event.preventDefault();
			const valid = api.reportValidity();
			if (!valid) return;
			if (bindings.resetOnSubmit !== false) api.reset();
			if (bindings.onSubmit) bindings.onSubmit(event);
		},

		getFieldErrors: (names) => selectFieldErrors(store.getState(), names),
		isFieldInvalid: (names) => selectIsFieldInvalid(store.getState(), names),
		isFieldTouched: (names) => selectIsFieldTouched(store.getState(), names),
		isTouched: () => store.getState().touchedFields.length > 0,

		touch: (names) => {
			const list = Array.isArray(names) ? names : [names];
			store.setState((state) => {
				const touchedFields = [...new Set([...state.touchedFields, ...list])];
				return touchedFields.length === state.touchedFields.length ? {} : { touchedFields };
			});
		},

		handleFieldChange: (event, value) => {
			const { data = /** @type {T} */ (DEFAULT_DATA), onChange } = getConfig();
			if (!onChange) return;
			const castValue = /** @type {string} */ (value);
			const realEvent = typeof event === 'string'
				? { target: { name: event, value: castValue } }
				: event;
			onChange(updateDataFromEvents(/** @type {T & object} */ (data), realEvent), realEvent);
		},

		getFieldErrorDescribedBy: (name) => selectFieldErrorDescribedBy(store.getState(), name),

		registerFieldError: (key, name, errorId) => {
			store.setState((state) => {
				const index = state.fieldErrorRegistry.findIndex((entry) => entry.key === key);
				if (index === -1) {
					return { fieldErrorRegistry: [...state.fieldErrorRegistry, { key, name, id: errorId }] };
				}
				const current = state.fieldErrorRegistry[index];
				if (current.name === name && current.id === errorId) return {};
				// Updating in place keeps the mount order of the IDREF list.
				const fieldErrorRegistry = state.fieldErrorRegistry.slice();
				fieldErrorRegistry[index] = { key, name, id: errorId };
				return { fieldErrorRegistry };
			});
		},

		unregisterFieldError: (key) => {
			store.setState((state) => {
				const fieldErrorRegistry = state.fieldErrorRegistry.filter((entry) => entry.key !== key);
				return fieldErrorRegistry.length === state.fieldErrorRegistry.length
					? {}
					: { fieldErrorRegistry };
			});
		},

		bindSubmit: (next) => { bindings = next; },
		revalidate: (data) => { getThrottledValidator()(data ?? DEFAULT_DATA); },
		setErrorMessages: (errorMessages) => { store.setState({ errorMessages }); },
		dispose: () => { if (throttled) throttled.cancel(); },
	};

	return api;
};

const noopSubscribe = () => () => {};
const getNothing = () => null;

/**
 * Internal hook behind `useForm` and `<Form>`: owns the store for the
 * lifetime of the component, keeps the configuration reachable through a
 * latest-ref, drives re-validation, and subscribes the owning component to
 * the whole snapshot. `config === null` (hook-mode `<Form>`, which receives
 * an external form) creates nothing and returns `null`. The mode is fixed
 * at mount.
 *
 * @template T
 * @param {UseFormConfig<T> | null} config
 * @returns {FormApi<T> | null}
 */
export const useFormStore = (config) => {
	const reactId = useId();
	const latest = useRef(config);
	latest.current = config;

	const [api] = useState(() => (
		config
			? createFormApi(config.id ?? reactId, () => /** @type {UseFormConfig<T>} */ (latest.current))
			: null
	));

	// Subscribe the owner to every state change (`form.valid` in the parent
	// must be reactive). The snapshot itself is read through the getters.
	useSyncExternalStore(
		api ? api.subscribe : noopSubscribe,
		api ? api.getState : getNothing,
		api ? api.getState : getNothing,
	);

	const data = config ? config.data : undefined;
	const schema = config ? config.schema : undefined;
	const throttleDuration = config ? config.throttleDuration : undefined;
	const errorMessages = config ? config.errorMessages : undefined;

	// Re-validate when a validation input changes. The mount-time run is
	// skipped: the store was created with a synchronous first validation.
	const validatedAtCreation = useRef(true);
	useEffect(() => {
		if (!api) return;
		if (validatedAtCreation.current) {
			validatedAtCreation.current = false;
			return;
		}
		api.revalidate(data);
	}, [api, data, schema, throttleDuration]);

	useEffect(() => {
		if (api) api.setErrorMessages(errorMessages);
	}, [api, errorMessages]);

	useEffect(() => () => { if (api) api.dispose(); }, [api]);

	return api;
};

/**
 * Owns a form's state and validation in the component that renders the
 * `<Form>`, so `valid` / `errors` / `reset()` are reachable where the
 * submit button lives. Returns a referentially stable `FormApi`.
 *
 * @template [T = Record<string, unknown>]
 * @param {UseFormConfig<T>} config
 * @returns {FormApi<T>}
 */
const useForm = (config) => /** @type {FormApi<T>} */ (useFormStore(config));

export default useForm;
