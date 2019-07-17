import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import ReactSelect from 'react-select';

import './Select.scss';

const Select = props => (
	<ReactSelect
		classNamePrefix="Jvf_Select"
		{...props}
	/>
);

export default Select;
