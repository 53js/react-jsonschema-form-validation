import classnames from 'classnames';
import memoize from 'memoize-one';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { withFormContext } from '../Form/Context';
import getErrorMessage from './getErrorMessage';

class FieldError extends PureComponent {
	memoGetClassnames = memoize((className, isSubmitted, isTouched) => classnames(
		'Jfv_FieldError',
		className,
		{
			isSubmitted,
			isTouched,
		},
	))

	memoGetFieldErrorMessage = memoize((error, formErrorMessages, fieldErrorMessages) => {
		const errorMessages = { ...formErrorMessages, ...fieldErrorMessages };
		return getErrorMessage(error, errorMessages);
	})

	getClassnames = (form) => {
		const { className, name } = this.props;
		const { isFieldTouched, isSubmitted } = form;

		return this.memoGetClassnames(
			className,
			isSubmitted,
			isFieldTouched(name),
		);
	}

	getFieldErrorMessage = (error, form) => {
		const { errorMessages: fieldErrorMessages } = this.props;
		const { errorMessages: formErrorMessages } = form;
		return this.memoGetFieldErrorMessage(error, formErrorMessages, fieldErrorMessages);
	}

	render() {
		const {
			children,
			className,
			component: Component,
			errorMessages,
			name,
			...props
		} = this.props;

		return withFormContext((form) => {
			const fieldErrors = form.getFieldErrors(name);
			if (!fieldErrors.length) return null;

			return (
				<Component className={this.getClassnames(form)} {...props}>
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

export default FieldError;
