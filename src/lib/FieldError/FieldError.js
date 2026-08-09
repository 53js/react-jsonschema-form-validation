/**
 * @import {
 *   ReactNode,
 *   ElementType,
 *   ComponentProps,
 * } from 'react'
 * @import { FormattedError, SafePropsOmit } from '../Form/helpers'
 * @import { ErrorMessagesMap, FormContextValue } from '../Form/Context.types'
 */

import classnames from 'classnames';
import memoize from 'memoize-one';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import getFieldErrorId from '../a11y';
import { withFormContext } from '../Form/Context';
import getErrorMessage from './getErrorMessage';

/**
 * Base props of `<FieldError>` — the validation-specific props handled by
 * the component itself. The public, polymorphic `FieldErrorProps<C>` extends
 * this with the props of the underlying component `C`.
 *
 * @typedef {{
 *   children?: ReactNode,
 *   className?: string,
 *   component?: ElementType,
 *   errorMessages?: ErrorMessagesMap | null,
 *   id?: string | null,
 *   name: string,
 * }} FieldErrorBaseProps
 */

/**
 * Polymorphic props of `<FieldError>`. When `component={X}` is supplied,
 * every prop accepted by `X` is also accepted here (with autocomplete and
 * typo detection). The default `C = 'div'` matches the runtime default.
 *
 * - `name`            — path of the form field whose first error should be shown.
 * - `errorMessages`   — optional per-field overrides; they take priority over the
 *                       map declared at the `<Form>` level (see `ErrorMessagesMap`).
 * - `component`       — element rendered when an error is present (default `'div'`).
 * - `children`        — replaces the auto-generated message when provided.
 * - `id`              — overrides the default deterministic id; the effective id is
 *                       registered in the form, so `<Field>`'s `aria-describedby`
 *                       follows it automatically.
 *
 * @template {ElementType} [C = 'div']
 * @typedef {(
 *   Omit<FieldErrorBaseProps, 'component'>
 *   & { component?: C }
 *   & SafePropsOmit<ComponentProps<C>, keyof FieldErrorBaseProps | 'ref'>
 * )} FieldErrorProps
 */

/**
 * Props of the internal implementation: the public props plus the form
 * context injected as a regular prop by the wrapper below.
 *
 * @typedef {FieldErrorBaseProps & { form: FormContextValue }} FieldErrorInnerProps
 */

// Module-level counter giving each mounted <FieldError> a stable identity
// (`key`) in the Form's id registry.
let nextFieldErrorKey = 0;
const createFieldErrorKey = () => {
	nextFieldErrorKey += 1;
	return `jfve${nextFieldErrorKey}`;
};

/**
 * Internal implementation. Receives the form context as a `form` prop —
 * injected by the `withFormContext` render-prop in the public wrapper —
 * so the registration lifecycles below can use it. (`static contextType`
 * would need the real React context object, which the unit tests replace
 * with a plain mock; the render-prop also matches the existing style.)
 *
 * Registration is independent from rendering, on purpose: the registry
 * entry exists as long as the component is mounted, even while no error is
 * displayed (render returns `null`) — an `aria-describedby` IDREF pointing
 * to an absent element is ignored by assistive technologies.
 *
 * @extends {PureComponent<FieldErrorInnerProps>}
 */
class FieldErrorInner extends PureComponent {
	fieldErrorKey = createFieldErrorKey();

	memoGetClassnames = memoize((
		/** @type {string | undefined} */ className,
		/** @type {boolean} */ isSubmitted,
		/** @type {boolean} */ isTouched,
	) => classnames(
		'Jfv_FieldError',
		className,
		{
			isSubmitted,
			isTouched,
		},
	))

	memoGetFieldErrorMessage = memoize((
		/** @type {FormattedError} */ error,
		/** @type {ErrorMessagesMap | undefined} */ formErrorMessages,
		/** @type {ErrorMessagesMap | null | undefined} */ fieldErrorMessages,
	) => {
		const errorMessages = { ...formErrorMessages, ...fieldErrorMessages };
		return getErrorMessage(error, errorMessages);
	})

	// Registration happens in effects only — never during render. The
	// resulting Form setState flushes before the browser paints, so no
	// intermediate state is visible.
	componentDidMount() {
		const { form, name } = this.props;
		form.registerFieldError(this.fieldErrorKey, name, this.getId());
	}

	/** @param {FieldErrorInnerProps} prevProps */
	componentDidUpdate(prevProps) {
		// Anti-loop guard: re-register only when the (name, id) pair
		// actually changed — paired with the identical-entry bail-out in
		// Form.registerFieldError.
		const { form, name } = this.props;
		const prevId = prevProps.id != null
			? prevProps.id
			: getFieldErrorId(prevProps.form.formId, prevProps.name);
		if (prevProps.name === name && prevId === this.getId()) return;
		form.registerFieldError(this.fieldErrorKey, name, this.getId());
	}

	componentWillUnmount() {
		const { form } = this.props;
		form.unregisterFieldError(this.fieldErrorKey);
	}

	getClassnames = () => {
		const { className, form, name } = this.props;
		const { isFieldTouched, isSubmitted } = form;

		return this.memoGetClassnames(
			className,
			isSubmitted,
			isFieldTouched(name),
		);
	}

	/** @param {FormattedError} error */
	getFieldErrorMessage = (error) => {
		const { errorMessages: fieldErrorMessages, form } = this.props;
		const { errorMessages: formErrorMessages } = form;
		return this.memoGetFieldErrorMessage(error, formErrorMessages, fieldErrorMessages);
	}

	/**
	 * Effective id: the user-supplied `id` prop, or the deterministic
	 * default derived from (formId, name). The same value is registered in
	 * the Form registry, so a custom id never desynchronizes the
	 * `aria-describedby` of the matching `<Field>`.
	 */
	getId = () => {
		const { form, id, name } = this.props;
		return id != null ? id : getFieldErrorId(form.formId, name);
	}

	render() {
		const {
			children,
			className,
			component: Component = 'div',
			errorMessages,
			form,
			id,
			name,
			...props
		} = this.props;

		const fieldErrors = form.getFieldErrors(name);
		if (!fieldErrors.length) return null;

		return (
			<Component
				className={this.getClassnames()}
				id={this.getId()}
				role="alert"
				{...props}
			>
				{
					children
					|| this.getFieldErrorMessage(fieldErrors[0])
				}
			</Component>
		);
	}
}

FieldErrorInner.propTypes = {
	children: PropTypes.node,
	className: PropTypes.string,
	component: PropTypes.elementType,
	errorMessages: PropTypes.objectOf(PropTypes.func),
	form: PropTypes.shape({
		errorMessages: PropTypes.objectOf(PropTypes.func),
		formId: PropTypes.string,
		getFieldErrors: PropTypes.func.isRequired,
		isFieldTouched: PropTypes.func.isRequired,
		isSubmitted: PropTypes.bool,
		registerFieldError: PropTypes.func.isRequired,
		unregisterFieldError: PropTypes.func.isRequired,
	}).isRequired,
	id: PropTypes.string,
	name: PropTypes.string.isRequired,
};

FieldErrorInner.defaultProps = {
	children: null,
	className: '',
	component: 'div',
	errorMessages: null,
	id: null,
};

/**
 * Public component: a thin wrapper reading the form context and passing it
 * to the implementation as the `form` prop.
 *
 * @param {FieldErrorBaseProps} props
 */
const FieldError = (props) => withFormContext(
	(form) => <FieldErrorInner {...props} form={form} />,
);

FieldError.propTypes = {
	children: PropTypes.node,
	className: PropTypes.string,
	component: PropTypes.elementType,
	errorMessages: PropTypes.objectOf(PropTypes.func),
	id: PropTypes.string,
	name: PropTypes.string.isRequired,
};

// No `FieldError.defaultProps` here on purpose: defaultProps on FUNCTION
// components are deprecated in React 18.3 (runtime warning) and silently
// ignored in React 19. The defaults live on the `FieldErrorInner` CLASS
// above (still fully supported, like `Form.defaultProps`), which is where
// the props are actually consumed.

// Polymorphic re-typing: the implementation is non-generic internally (uses
// `FieldErrorBaseProps`); the cast on the default export restores the
// generic so consumers get autocomplete and type-checking on `component`'s
// own props.
export default /** @type {<C extends ElementType = 'div'>(
	props: FieldErrorProps<C>
) => JSX.Element | null} */ (
	/** @type {unknown} */ (FieldError)
);
