/**
 * POC criterion 4: the Constraint Validation projection as a pure
 * subscriber — imports only the public entry + the sketch.
 */
import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react';

import { Form, Field, useForm } from '..';
import useConstraintValidity from './useConstraintValidity';

const schema = {
	type: 'object',
	properties: { email: { type: 'string', format: 'email' } },
	required: ['email'],
};

const Demo = ({ initial }) => {
	const [data, setData] = useState(initial);
	const form = useForm({
		schema, data, onChange: setData, id: 'cv', throttleDuration: 0,
	});
	useConstraintValidity(form);
	return (
		<Form form={form} onSubmit={() => {}}>
			<Field name="email" />
			<Field name="other" />
		</Form>
	);
};

it('projects FormError messages into ValidityState and clears them', () => {
	const { container } = render(<Demo initial={{ email: 'nope' }} />);
	const email = container.querySelector('input[name="email"]');
	const other = container.querySelector('input[name="other"]');

	expect(email.validity.customError).toBe(true);
	expect(email.validationMessage).toBe('must match format "email"');
	expect(email.matches(':invalid')).toBe(true);
	expect(other.validity.customError).toBe(false);
	expect(other.matches(':invalid')).toBe(false);

	fireEvent.change(email, { target: { name: 'email', value: 'hugo@53js.fr' } });
	expect(email.validity.customError).toBe(false);
	expect(email.matches(':invalid')).toBe(false);

	fireEvent.change(email, { target: { name: 'email', value: '' } });
	expect(email.validity.customError).toBe(true);
	expect(email.validationMessage).toBe("must have required property 'email'");
});
