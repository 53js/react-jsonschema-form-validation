import classnames from 'classnames';
import memoize from 'memoize-one';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

import { withContext } from '../Form/Context';

class Field extends PureComponent {
	memoGetClassnames = memoize((className, isInvalid, isSubmitted, isTouched) => classnames(
		'Jfv_Field',
		className,
		{
			isInvalid,
			isSubmitted,
			isTouched,
		},
	))

	memoGetOnBlurHandler = memoize((touch, name, onBlur) => (event) => {
		touch(name);
		if (onBlur) onBlur(event);
	})

	memoGetOnChangeHandler = memoize((onChange, handleFieldChange) => (event) => {
		if (onChange) {
			// Pass Form.handleFieldChange handler as extra parameter to the onChange handler
			onChange(event, handleFieldChange);
			return;
		}

		handleFieldChange(event);
	})

	getClassnames = (form) => {
		const { className, name } = this.props;
		const { isFieldInvalid, isFieldTouched, isSubmitted } = form;

		return this.memoGetClassnames(
			className,
			isFieldInvalid(name),
			isSubmitted,
			isFieldTouched(name),
		);
	}

	render() {
		const {
			children,
			className,
			component: Component,
			onBlur,
			onChange,
			name,
			forwardedRef,
			...props
		} = this.props;

		return withContext((form) => (
			<Component
				className={this.getClassnames(form)}
				name={name}
				onBlur={this.memoGetOnBlurHandler(form.touch, name, onBlur)}
				onChange={this.memoGetOnChangeHandler(onChange, form.handleFieldChange)}
				ref={forwardedRef}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}
			>
				{children}
			</Component>
		));
	}
}

Field.propTypes = {
	children: PropTypes.node,
	className: PropTypes.string,
	component: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
	forwardedRef: PropTypes.oneOfType([
		PropTypes.shape({}),
		PropTypes.func,
	]),
	onBlur: PropTypes.func,
	onChange: PropTypes.func,
	name: PropTypes.string.isRequired,
};

Field.defaultProps = {
	children: null,
	className: '',
	component: 'input',
	forwardedRef: null,
	onBlur: null,
	onChange: null,
};

export default React.forwardRef((props, ref) => (
	// eslint-disable-next-line react/jsx-props-no-spreading
	<Field {...props} forwardedRef={ref} />
));
