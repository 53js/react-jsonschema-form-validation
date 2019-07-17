import classnames from 'classnames';
import memoize from 'memoize-one';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

import Context from '../Form/Context';

class Field extends PureComponent {
	getOnBlurHandler = memoize((touch, name, onBlur) => (event) => {
		touch(name);
		if (onBlur) onBlur(event);
	});

	getOnChangeHandler = memoize((onChange, handleFieldChange) => (event) => {
		if (onChange) {
			// Pass Form.handleFieldChange handler as extra parameter to the onChange handler
			onChange(event, handleFieldChange);
			return;
		}

		handleFieldChange(event);
	});

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

		return (
			<Context.Consumer>
				{form => (
					<Component
						{...props}
						className={
							classnames(
								'Sjf_Field',
								className,
								{
									isInvalid: form.isFieldInvalid(name),
									isSubmitted: form.isSubmitted,
									isTouched: form.isFieldTouched(name),
								},
							)
						}
						name={name}
						onBlur={this.getOnBlurHandler(form.touch, name, onBlur)}
						onChange={this.getOnChangeHandler(onChange, form.handleFieldChange)}
						ref={forwardedRef}
					>
						{children}
					</Component>
				)}
			</Context.Consumer>
		);
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

// eslint-disable-next-line react/no-multi-comp
export default React.forwardRef((props, ref) => (
	<Field {...props} forwardedRef={ref} />
));
