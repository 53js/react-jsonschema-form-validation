import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Button } from 'reactstrap';

const Submit = ({ loading = false, success = false, ...rest }) => (
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

export default Submit;
