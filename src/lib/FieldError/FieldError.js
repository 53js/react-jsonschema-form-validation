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
 *
 * @template {ElementType} [C = 'div']
 * @typedef {(
 *   Omit<FieldErrorBaseProps, 'component'>
 *   & { component?: C }
 *   & SafePropsOmit<ComponentProps<C>, keyof FieldErrorBaseProps | 'ref'>
 * )} FieldErrorProps
 */

/** @extends {PureComponent<FieldErrorBaseProps>} */
class FieldError extends PureComponent {
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

	/**
	 * @param {FormContextValue} form
	 */
	getClassnames = (form) => {
		const { className, name } = this.props;
		const { isFieldTouched, isSubmitted } = form;

		return this.memoGetClassnames(
			className,
			isSubmitted,
			isFieldTouched(name),
		);
	}

	/**
	 * @param {FormattedError} error
	 * @param {FormContextValue} form
	 */
	getFieldErrorMessage = (error, form) => {
		const { errorMessages: fieldErrorMessages } = this.props;
		const { errorMessages: formErrorMessages } = form;
		return this.memoGetFieldErrorMessage(error, formErrorMessages, fieldErrorMessages);
	}

	render() {
		const {
			children,
			className,
			component: Component = 'div',
			errorMessages,
			name,
			...props
		} = this.props;

		return withFormContext((form) => {
			const fieldErrors = form.getFieldErrors(name);
			if (!fieldErrors.length) return null;

			return (
				<Component className={this.getClassnames(form)} role="alert" {...props}>
					{
						children
						|| this.getFieldErrorMessage(fieldErrors[0], form)
					}
				</Component>
			);
		});
	}
}

FieldError.propTypes = {
	children: PropTypes.node,
	className: PropTypes.string,
	component: PropTypes.elementType,
	errorMessages: PropTypes.objectOf(PropTypes.func),
	name: PropTypes.string.isRequired,
};

FieldError.defaultProps = {
	children: null,
	component: 'div',
	errorMessages: null,
	className: '',
};

// Polymorphic re-typing: the class is non-generic internally (uses
// `FieldErrorBaseProps`); the cast on the default export restores the
// generic so consumers get autocomplete and type-checking on `component`'s
// own props.
export default /** @type {<C extends ElementType = 'div'>(
	props: FieldErrorProps<C>
) => JSX.Element | null} */ (
	/** @type {unknown} */ (FieldError)
);
