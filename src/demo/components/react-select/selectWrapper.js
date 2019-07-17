import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import Select from 'react-select';
import PropTypes from 'prop-types';

import './selectWrapper.scss';

const SelectWrapper = ({ options, className, ...rest }) => (
	<div className="select">
		<Select
			classNamePrefix={className.includes('isInvalid isSubmitted') ? 'error-border' : ''}
			options={options}
			{...rest}
		/>
	</div>
);

export default SelectWrapper;

SelectWrapper.propTypes = {
	className: PropTypes.string,
	options: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};

SelectWrapper.defaultProps = {
	className: '',
};
