/**
 * @import {
 *   ReactNode,
 *   ElementType,
 *   FormEvent,
 *   FormHTMLAttributes,
 *   ComponentProps,
 * } from 'react'
 * @import { JSONSchema7Definition } from 'json-schema'
 * @import { FormattedError, FormChangeEvent, SafePropsOmit } from './helpers'
 * @import { ErrorMessagesMap } from './Context.types'
 * @import { ThrottledFunc } from './throttle'
 */

/**
 * Options controlling how the form scrolls to the first invalid field on
 * a failed submit. Forwarded to the native `element.scrollIntoView()`.
 *
 * Native `scrollIntoView` options (`behavior`, `block`, `inline`) are passed
 * through as-is. The legacy `align` option ('top' | 'middle' | 'bottom'),
 * inherited from the former `scroll-to-element` dependency, is mapped to
 * `block` ('start' | 'center' | 'end'); an explicit `block` wins over `align`.
 *
 * The legacy `offset`, `duration` and `ease` options are still accepted for
 * backward compatibility but are IGNORED: the native scrolling API has no
 * equivalent — animation is delegated to the browser via `behavior: 'smooth'`
 * (the default).
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

import Ajv from 'ajv';
import classnames from 'classnames';
import memoize from 'memoize-one';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import FormContext from './Context';
import throttle from './throttle';
import {
	createAjv,
	filterByFieldNameWithWildcard,
	formatData,
	formatErrors,
	updateDataFromEvents,
} from './helpers';

/**
 * Base props of `<Form>` — the validation-specific props the component
 * handles itself. The public, polymorphic `FormProps<T, C>` extends this
 * with the props of the underlying component `C` and typed data `T`.
 *
 * @typedef {{
 *   ajv?: Ajv.Ajv,
 *   children?: ReactNode,
 *   className?: string,
 *   component?: ElementType,
 *   data?: Record<string, unknown>,
 *   throttleDuration?: number,
 *   errorMessages?: ErrorMessagesMap,
 *   onChange?: ((data: Record<string, unknown>, event?: FormChangeEvent) => void) | null,
 *   onSubmit: (event: FormEvent) => void,
 *   schema: JSONSchema7Definition,
 *   scrollToError?: boolean,
 *   scrollOptions?: JfvScrollOptions,
 * }} FormBaseProps
 */

/**
 * Polymorphic props of `<Form>`. Two type parameters:
 * - `T` — shape of the form data. Inferred from `data` / `onChange`, or
 *         you can pass it explicitly via `<Form<UserData> …>`. Default
 *         `Record<string, unknown>`. Note that `T` is a *promise* by the
 *         caller: nothing at compile time ensures the JSON Schema actually
 *         validates `T`.
 * - `C` — element type used for the form wrapper (the `component` prop).
 *         Default `'form'`. When supplied, every prop accepted by `C` is
 *         also accepted on `<Form>` (autocomplete + typo detection).
 *
 * Field reference:
 * - `schema`        — JSON-Schema used to validate `data`.
 * - `data`          — current form values, fully controlled by the parent.
 * - `onChange`      — called with the updated data on every field change.
 * - `onSubmit`      — called only when validation passes at submit time.
 * - `errorMessages` — map of error messages shared by every `<FieldError>`
 *                     descendant (see `ErrorMessagesMap`).
 * - `ajv`           — optional pre-configured AJV instance, useful to plug
 *                     in custom keywords/formats.
 * - `component`     — element rendered for the form wrapper (default `<form noValidate>`).
 *
 * @template [T = Record<string, unknown>]
 * @template {ElementType} [C = 'form']
 * @typedef {(
 *   Omit<FormBaseProps, 'component' | 'data' | 'onChange'>
 *   & {
 *     component?: C,
 *     data?: T,
 *     onChange?: ((data: T, event?: FormChangeEvent) => void) | null,
 *   }
 *   & SafePropsOmit<ComponentProps<C>, keyof FormBaseProps | 'ref'>
 * )} FormProps
 */

/**
 * Internal state held by `<Form>`. Exposed (via the context) to descendants
 * so they can react to validation results and touched fields.
 *
 * @typedef {{
 *   errors: FormattedError[],
 *   isSubmitted: boolean,
 *   touchedFields: string[],
 *   valid: boolean,
 * }} FormState
 */

/**
 * Return type of the local `throttle` helper applied to the form validator.
 * Its `cancel` method discards pending runs when the schema changes or the
 * component unmounts.
 *
 * @typedef {ThrottledFunc<(data: object) => void>} ThrottledValidator
 */

/**
 * Default wrapper element used when no `component` prop is supplied. Renders
 * a plain `<form noValidate>` so the browser's native validation UI does not
 * interfere with AJV's.
 *
 * @param {FormHTMLAttributes<HTMLFormElement>} props
 */
const DefaultFormComponent = (props) => <form noValidate {...props} />;

// Module-level defaults — shared by every `<Form>` instance via both
// `Form.defaultProps` and the destructuring fallbacks in the methods below.
// Extracting them here (instead of duplicating the literals) keeps the AJV
// instance stable across renders (critical for `memoGetValidator`'s
// memoization) and removes the need to cast `undefined`-typed props.
const DEFAULT_AJV = createAjv();
const DEFAULT_THROTTLE_DURATION = 200;
/** @type {Record<string, unknown>} */
const DEFAULT_DATA = {};

// Mapping from the legacy `scroll-to-element` `align` option to the native
// `scrollIntoView` `block` option.
/** @type {Record<string, ScrollLogicalPosition>} */
const ALIGN_TO_BLOCK = {
	top: 'start',
	middle: 'center',
	bottom: 'end',
};

/** @type {FormState} */
const initialState = {
	errors: [],
	isSubmitted: false,
	touchedFields: [],
	valid: true,
};

/** @extends {PureComponent<FormBaseProps, FormState>} */
class Form extends PureComponent {
	/** @type {FormState} */
	state = { ...initialState }

	/** @type {ThrottledValidator | undefined} */
	throttledValidator;

	memoGetClassnames = memoize((
		/** @type {string | undefined} */ className,
		/** @type {boolean} */ isSubmitted,
	) => classnames(
		'Jfv_Form',
		className,
		{ isSubmitted },
	))

	memoGetContext = memoize((
		/** @type {FormState} */ state,
		/** @type {ErrorMessagesMap | undefined} */ errorMessages,
	) => ({
		...state,
		errorMessages,
		getFieldErrors: this.getFieldErrors,
		handleFieldChange: this.handleFieldChange,
		isFieldTouched: this.isFieldTouched,
		isFieldInvalid: this.isFieldInvalid,
		isTouched: this.isTouched,
		touch: this.touch,
	}))

	memoGetValidator = memoize((
		/** @type {Ajv.Ajv} */ ajv,
		/** @type {JSONSchema7Definition} */ schema,
		/** @type {number} */ throttleDuration,
	) => {
		const validate = ajv.compile(schema);

		/** @param {object} data */
		const validator = (data) => {
			const formattedData = formatData(data);
			// Cast: AJV's `compile()` return type includes `boolean | Promise<...>`
			// because async schemas exist. We do not use them, so the result is
			// always a synchronous boolean here.
			const valid = /** @type {boolean} */ (validate(formattedData));
			const errors = formatErrors(validate.errors);

			this.setState({ valid, errors });
		};

		if (this.throttledValidator) this.throttledValidator.cancel();
		this.throttledValidator = throttle(validator, throttleDuration);

		// We memoize the throttled function so that two consecutive validations
		// with the same data reference skip work entirely (AJV is fast but the
		// no-op short-circuit is even faster).
		return memoize(this.throttledValidator);
	})

	componentDidMount() {
		this.validate();
	}

	componentDidUpdate() {
		this.validate();
	}

	componentWillUnmount() {
		if (this.throttledValidator) this.throttledValidator.cancel();
	}

	getClassnames = () => {
		const { className } = this.props;
		const { isSubmitted } = this.state;

		return this.memoGetClassnames(
			className,
			isSubmitted,
		);
	}

	getContext = () => {
		const { errorMessages } = this.props;
		return this.memoGetContext(this.state, errorMessages);
	}

	/**
	 * @param {string | string[]} fieldNames
	 * @returns {FormattedError[]}
	 */
	getFieldErrors = (fieldNames) => {
		const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
		const { errors } = this.state;

		return names.reduce(
			(fieldsErrors, fieldName) => [
				...fieldsErrors,
				...filterByFieldNameWithWildcard(errors, fieldName),
			],
			/** @type {FormattedError[]} */ ([]),
		);
	}

	getValidator = () => {
		// Destructuring defaults reference the same module-level constants
		// declared in `Form.defaultProps`, so `memoGetValidator`'s
		// memoization stays stable across renders while TS sees the
		// non-optional types it needs.
		const {
			ajv = DEFAULT_AJV,
			schema,
			throttleDuration = DEFAULT_THROTTLE_DURATION,
		} = this.props;
		return this.memoGetValidator(ajv, schema, throttleDuration);
	}

	/**
	 * @param {FormChangeEvent | string} event Either a real change event or
	 *                                          a field path (string).
	 * @param {unknown} [value] Used only when `event` is a string.
	 */
	handleFieldChange = (event, value) => {
		const { data = DEFAULT_DATA, onChange } = this.props;
		if (onChange) {
			// Cast on `value`: `FormInputTarget.value` is typed as `string` to
			// mirror real DOM inputs. When the change is synthesized from a
			// (name, value) pair, `value` can be any JSON-compatible scalar —
			// the runtime stores it verbatim, the cast satisfies the
			// structural type without altering behavior.
			const castValue = /** @type {string} */ (value);
			const realEvent = typeof event === 'string'
				? { target: { name: event, value: castValue } }
				: event;
			const newData = updateDataFromEvents(data, realEvent);
			onChange(newData, realEvent);
		}
	}

	/** @param {FormEvent} event */
	handleSubmit = (event) => {
		event.preventDefault();
		this.submit(event);
	}

	handleSubmitError = () => {
		const { scrollToError } = this.props;
		const { errors } = this.state;
		/* istanbul ignore next */
		if (typeof process !== 'undefined' && process?.env?.REACT_APP_JFV_DEBUG === 'true') {
			console.log(errors); // eslint-disable-line no-console
		}
		if (scrollToError) this.scrollToFirstError();
	}

	/** @param {FormEvent} event */
	handleSubmitSuccess = (event) => {
		const { onSubmit } = this.props;
		this.reset();
		onSubmit(event);
	}

	/**
	 * @param {string | string[]} fieldNames
	 * @returns {boolean}
	 */
	isFieldInvalid = (fieldNames) => this.getFieldErrors(fieldNames).length > 0

	/**
	 * @param {string | string[]} fieldNames
	 * @returns {boolean}
	 */
	isFieldTouched = (fieldNames) => {
		const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
		const { touchedFields } = this.state;
		return !!names.find((fieldName) => (
			filterByFieldNameWithWildcard(
				touchedFields.map((field) => ({ field })),
				fieldName,
			).length > 0
		));
	}

	/** @returns {boolean} */
	isTouched = () => {
		const { touchedFields } = this.state;
		return !!touchedFields.length;
	}

	reset = () => this.setState(initialState)

	scrollToFirstError = () => {
		const { scrollOptions } = this.props;
		const { errors } = this.state;
		const firstError = errors[0];
		// Nothing to scroll to when the form has no errors (e.g. direct call
		// through a ref on a valid form).
		if (!firstError) return;
		const element = document.getElementsByName(firstError.field)[0];
		// No DOM element may carry the error's name (custom field, error on a
		// nested object): skip scrolling instead of forwarding `undefined`.
		if (!element) return;
		const {
			align,
			behavior = 'smooth',
			block = (align && ALIGN_TO_BLOCK[align]) || 'center',
			inline = 'nearest',
		} = scrollOptions || {};
		// Legacy `offset`, `duration` and `ease` options (scroll-to-element)
		// are intentionally ignored: the native API has no equivalent.
		// Guard: some environments (e.g. consumers' jsdom test setups) do not
		// implement scrollIntoView — skip scrolling there, but keep the a11y
		// focus move below.
		if (typeof element.scrollIntoView === 'function') {
			element.scrollIntoView({ behavior, block, inline });
		}
		// Move keyboard focus to the first invalid field (a11y). The scroll
		// itself is handled above, hence `preventScroll`.
		element.focus({ preventScroll: true });
	}

	/** @param {FormEvent} event */
	submit = (event) => {
		const { valid } = this.state;

		this.setState({ isSubmitted: true });

		if (valid) this.handleSubmitSuccess(event);
		else this.handleSubmitError();
	}

	/** @param {string | string[]} fieldNames */
	touch = (fieldNames) => {
		const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
		const { touchedFields } = this.state;
		this.setState({
			touchedFields: [
				...new Set([
					...touchedFields,
					...names,
				]),
			],
		});
	}

	validate = () => {
		const { data = DEFAULT_DATA } = this.props;
		const validate = this.getValidator();
		validate(data);
	}

	render() {
		const {
			ajv,
			children,
			className,
			component: FormComponent = DefaultFormComponent,
			data,
			throttleDuration,
			errorMessages,
			onChange,
			onSubmit,
			schema,
			scrollOptions,
			scrollToError,
			...props
		} = this.props;

		return (
			<FormContext.Provider value={this.getContext()}>
				<FormComponent
					className={this.getClassnames()}
					onSubmit={this.handleSubmit}
					{...props}
				>
					{children}
				</FormComponent>
			</FormContext.Provider>
		);
	}
}

Form.propTypes = {
	ajv: PropTypes.instanceOf(Ajv),
	children: PropTypes.node,
	className: PropTypes.string,
	component: PropTypes.elementType,
	data: PropTypes.shape({}),
	throttleDuration: PropTypes.number,
	errorMessages: PropTypes.shape({}),
	onChange: PropTypes.func,
	onSubmit: PropTypes.func.isRequired,
	schema: PropTypes.shape({}).isRequired,
	scrollToError: PropTypes.bool,
	scrollOptions: PropTypes.shape({}),
};

Form.defaultProps = {
	ajv: DEFAULT_AJV,
	children: null,
	className: '',
	component: DefaultFormComponent,
	data: DEFAULT_DATA,
	errorMessages: {},
	onChange: null,
	scrollToError: true,
	scrollOptions: {
		behavior: 'smooth',
		block: 'center',
	},
	throttleDuration: DEFAULT_THROTTLE_DURATION,
};

// Polymorphic re-typing: the class is non-generic internally (uses
// `FormBaseProps`); the cast on the default export restores both generics
// (`T` for data shape, `C` for wrapper element) on the public API.
export default /** @type {<T = Record<string, unknown>, C extends ElementType = 'form'>(
	props: FormProps<T, C>
) => JSX.Element | null} */ (
	/** @type {unknown} */ (Form)
);
