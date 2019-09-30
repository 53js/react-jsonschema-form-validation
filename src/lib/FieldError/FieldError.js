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
			name,
		} = this.props;

		return withFormContext((form) => {
			const fieldErrors = form.getFieldErrors(name);
			if (!fieldErrors.length) return null;

			return (
				<div className={this.getClassnames(form)}>
					{
						children
						|| this.getFieldErrorMessage(fieldErrors[0], form)
					}
				</div>
			);
		});
	}
}

FieldError.propTypes = {
	children: PropTypes.node,
	className: PropTypes.string,
	errorMessages: PropTypes.objectOf(PropTypes.func),
	name: PropTypes.string.isRequired,
};

FieldError.defaultProps = {
	children: null,
	errorMessages: null,
	className: '',
};

export default FieldError;
