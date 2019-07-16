import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'reactstrap';

const Submit = (props) => {
	const {
		loading,
		success,
	} = props;

	return (
		<Button
			color={success ? 'success' : 'primary'}
			disabled={loading || success}
			size="xl"
			type="submit"
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
