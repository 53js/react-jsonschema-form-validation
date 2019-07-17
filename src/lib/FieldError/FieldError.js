import classnames from 'classnames';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import Context from '../Form/Context';
import getErrorMessage from './getErrorMessage';

class FieldError extends PureComponent {
	render() {
		const {
			children,
			className,
			errorMessages,
			name,
		} = this.props;

		return (
			<Context.Consumer>
				{(form) => {
					const fieldErrors = form.getFieldErrors(name);
					const fieldErrorMessages = { ...form.errorMessages, ...errorMessages };

					const classes = classnames(
						'Jfv_FieldError',
						className,
						{
							isSubmitted: form.isSubmitted,
							isTouched: form.isFieldTouched(name),
						},
					);

					return fieldErrors.length
						? (
							<div className={classes}>
								{
									children
									|| getErrorMessage(fieldErrors[0], fieldErrorMessages)
								}
							</div>
						)
						: null;
				}}
			</Context.Consumer>
		);
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
