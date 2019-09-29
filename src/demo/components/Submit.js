import PropTypes from 'prop-types';
import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Button } from 'reactstrap';

const Submit = (props) => {
	const {
		loading,
		success,
		...rest
	} = props;

	return (
		<Button
			color={success ? 'success' : 'primary'}
			disabled={loading || success}
			size="xl"
			type="submit"
			{...rest}
		>
			{
				// eslint-disable-next-line no-nested-ternary
				loading
					? 'loading'
					: success
						? 'success'
						: 'submit'

			}
		</Button>
	);
};

Submit.propTypes = {
	loading: PropTypes.bool,
	success: PropTypes.bool,
};

Submit.defaultProps = {
	loading: false,
	success: false,
};

export default Submit;
