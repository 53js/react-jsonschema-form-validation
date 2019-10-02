import React, { useState } from 'react';

import {
	Field,
	FieldError,
	Form,
} from '../../lib';

import Submit from '../components/Submit';

const simpleJsonSchema = {
	type: 'object',
	properties: {
		email: { type: 'string', format: 'email', maxLength: 30 },
	},
	required: [
		'email',
	],
};

const HooksForm = () => {
	const [formData, setFormData] = useState({ email: '' });
	const [success, setSuccess] = useState(false);

	const handleChange = (newData) => {
		setFormData(newData);
		setSuccess(false);
	};

	const handleSubmit = () => {
		setSuccess(true);
	};

	return (
		<Form
			data={formData}
			onChange={handleChange}
			onSubmit={handleSubmit}
			schema={simpleJsonSchema}
		>
			<div className="form-group">
				<label>Email :</label>
				<Field
					className="form-control"
					name="email"
					value={formData.email}
				/>
				<FieldError name="email" />
			</div>
			<Submit success={success} />
		</Form>
	);
};

export default HooksForm;
