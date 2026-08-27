'use client';

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
	useInsertionEffect,
	useRef,
	useState,
} from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';

import { clonePlain, deepEqual } from './deepEqual';

import { runSchema } from './errors';
import { updateDataFromEvents } from './helpers';
import { getInternals, setInternals } from './internals';
import {
	selectFieldErrorDescribedBy,
	selectFieldErrors,
	selectIsFieldInvalid,
	selectFormState,
	selectIsFieldTouched,
	shallowEqual,
} from './selectors';
import { createFormStore } from './store';
import { throttle } from './throttle';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

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
 * The control of field `field` in the form `formId`: through the form
 * element's own `elements` collection first (native association — includes
 * portaled controls, excludes another form's field of the same name), then
 * the document as a fallback (custom components without native
 * association).
 *
 * @param {string} formId
 * @param {string} field
 * @returns {HTMLElement | undefined}
 */
const findControl = (formId, field) => {
	const formElement = document.getElementById(formId);
	const owned = formElement instanceof HTMLFormElement
		? formElement.elements.namedItem(field)
		: null;
	if (owned) {
		// A RadioNodeList (radio group) has no focus(): take its first control.
		const control = 'focus' in owned ? owned : /** @type {RadioNodeList} */ (owned)[0];
		return /** @type {HTMLElement | undefined} */ (control);
	}
	return document.getElementsByName(field)[0];
};

/**
 * Builds the api around a fresh store. The configuration is held here and
 * refreshed by the owning hook after each commit (`setConfig`): `data`,
 * `onChange`, `schema`… are never captured, so the api can stay
 * referentially stable.
 *
 * @template T
 * @param {string} id
 * @param {UseFormConfig<T>} initialConfig
 * @returns {FormApi<T>}
 */
const createFormApi = (id, initialConfig) => {
	let config = initialConfig;
	let notifiedErrorMessages = initialConfig.errorMessages;
	const getConfig = () => config;
	/** @type {Set<() => void>} */
	const configListeners = new Set();
	// First validation is synchronous: the very first render already sees
	// the right `valid` / `errors` (no flash of a wrongly enabled button).
	const store = createFormStore({
		...runSchema(initialConfig.schema, initialConfig.data ?? DEFAULT_DATA),
		touchedFields: [],
		isSubmitted: false,
		fieldErrorRegistry: [],
	});

	/** @type {FormBindings} */
	let bindings = {};
	/** @type {ThrottledFunc<(data: unknown) => void> | null} */
	let throttled = null;
	let throttledDuration = -1;

	/** @param {unknown} data */
	const validateNow = (data) => {
		const result = runSchema(getConfig().schema, data);
		const current = store.getState();
		// An equal result (deeply — `raw.data` included) is not re-emitted:
		// subscribers would only re-render into the very same state.
		if (current.valid !== result.valid || !deepEqual(current.errors, result.errors)) {
			store.setState(result);
		}
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
		const element = findControl(id, firstError.field);
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
		get errorMessages() { return getConfig().errorMessages; },
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

	};

	// Hooks-only members (see internals.js): never on the public api object.
	setInternals(api, {
		bindSubmit: (next) => { bindings = next; },
		setConfig: (next) => { config = next; },
		// Only `errorMessages` has render-time readers (<FieldError>, through
		// the config channel): notify them when its identity changed since
		// the last notification. Separate from `setConfig` because React
		// forbids scheduling updates from an insertion effect.
		notifyConfig: () => {
			if (config.errorMessages === notifiedErrorMessages) return;
			notifiedErrorMessages = config.errorMessages;
			configListeners.forEach((listener) => listener());
		},
		subscribeConfig: (listener) => {
			configListeners.add(listener);
			return () => { configListeners.delete(listener); };
		},
		getErrorMessages: () => getConfig().errorMessages,
		revalidate: (data) => { getThrottledValidator()(data ?? DEFAULT_DATA); },
		dispose: () => { if (throttled) throttled.cancel(); },
	});

	return api;
};

const noopSubscribe = () => () => {};
const getNothing = () => null;
/** @param {unknown} value */
const identity = (value) => value;

/**
 * Internal hook behind `useForm` and `<Form>`: owns the store for the
 * lifetime of the component, hands the latest configuration to the api
 * after each commit, drives re-validation, and subscribes the owning
 * component to the form state (registry changes excluded).
 * `config === null` (hook-mode `<Form>`, which receives
 * an external form) creates nothing and returns `null`. The mode is fixed
 * at mount.
 *
 * @template T
 * @param {UseFormConfig<T> | null} config
 * @returns {FormApi<T> | null}
 */
export const useFormStore = (config) => {
	const reactId = useId();
	const [api] = useState(() => (
		config ? createFormApi(config.id ?? reactId, config) : null
	));

	// The api reads the configuration at call time: refresh it once the
	// render is committed (never during render), before any event can fire.
	// An insertion effect runs before every layout effect of the commit, so
	// a child calling `checkValidity()` from its own layout effect already
	// sees the new `data`.
	useInsertionEffect(() => {
		if (api && config) getInternals(api).setConfig(config);
	});
	// The <FieldError>s subscribed to `errorMessages` are told afterwards:
	// an insertion effect may not schedule updates, a layout effect may.
	useIsomorphicLayoutEffect(() => {
		if (api) getInternals(api).notifyConfig();
	});

	// Subscribe the owner to the form state (`form.valid` in the parent must
	// be reactive) — not to the <FieldError> registry, which is the
	// components' business. The values are read through the getters.
	// Cast: with no api the snapshot is `null` and the selector the identity.
	const ownerSelector = /** @type {(state: FormState | null) => Record<string, unknown>} */ (
		/** @type {unknown} */ (api ? selectFormState : identity)
	);
	useSyncExternalStoreWithSelector(
		api ? api.subscribe : noopSubscribe,
		api ? api.getState : getNothing,
		api ? api.getState : getNothing,
		ownerSelector,
		shallowEqual,
	);

	const data = config ? config.data : undefined;
	const schema = config ? config.schema : undefined;
	const throttleDuration = config ? config.throttleDuration : undefined;

	// Re-validate when a validation input changes. `data` is compared
	// structurally: validation is a pure function of (schema, data), so a
	// fresh but equal object (`data: { ...state }` in the owner's render)
	// would only recompute the same result — and, through the emitted
	// snapshot, re-render the owner into another fresh object: a loop. The
	// inputs validated synchronously at store creation are remembered, so
	// the mount-time run of this effect (and its StrictMode re-run) does not
	// repeat that first validation either. The data is remembered by VALUE
	// (plain copy): an in-place mutation followed by a shallow copy
	// (`data.tags.push(x); setData({ ...data })`) is still seen as a change.
	const lastValidated = useRef(
		config ? { data: clonePlain(data), schema, throttleDuration } : null,
	);
	useEffect(() => {
		if (!api) return;
		const last = lastValidated.current;
		if (last && last.schema === schema
			&& last.throttleDuration === throttleDuration
			&& deepEqual(last.data, data)) return;
		lastValidated.current = { data: clonePlain(data), schema, throttleDuration };
		getInternals(api).revalidate(data);
	}, [api, data, schema, throttleDuration]);

	useEffect(() => () => { if (api) getInternals(api).dispose(); }, [api]);

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
export const useForm = (config) => /** @type {FormApi<T>} */ (useFormStore(config));
