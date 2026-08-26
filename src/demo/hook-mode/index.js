import React, { useState } from 'react';

import {
	Field,
	FieldError,
	Form,
	useForm,
} from '../../lib';

import Submit from '../components/Submit';

const schema = {
	type: 'object',
	properties: {
		email: { type: 'string', format: 'email' },
		age: { type: 'integer', minimum: 18 },
	},
	required: ['email', 'age'],
};

const initialData = { email: '', age: '' };

// Hook mode: the component that renders <Form> owns the form state, so
// `form.valid` / `form.errors` / `form.reset()` are reachable right next
// to the submit button — no child component needed.
const HookModeForm = () => {
	const [data, setData] = useState(initialData);
	const [success, setSuccess] = useState(false);
	const form = useForm({
		schema,
		data,
		onChange: (next) => {
			setData(next);
			setSuccess(false);
		},
	});

	const handleReset = () => {
		setData(initialData);
		setSuccess(false);
		form.reset();
	};

	return (
		<Form form={form} onSubmit={() => setSuccess(true)}>
			<div className="form-group">
				<label htmlFor="hook-email">Email :</label>
				<Field className="form-control" id="hook-email" name="email" type="email" />
				<FieldError name="email" />
			</div>
			<div className="form-group">
				<label htmlFor="hook-age">Age :</label>
				<Field className="form-control" id="hook-age" name="age" type="number" />
				<FieldError name="age" />
			</div>
			<p className="text-muted">
				{form.valid ? 'Everything looks fine.' : String(form.errors.length).concat(' problem(s) left.')}
			</p>
			<Submit disabled={!form.valid} success={success} />
			{' '}
			<button className="btn btn-link" onClick={handleReset} type="button">Reset</button>
		</Form>
	);
};

export default HookModeForm;
