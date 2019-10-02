import React from 'react';
/* eslint-disable import/no-extraneous-dependencies */
import { PrismCode } from 'react-prism';
import { Container, Row, Col } from 'reactstrap';
import { Link } from 'react-router-dom';
/* eslint-enable import/no-extraneous-dependencies */

import './Home.css';
import './prism.css';
import Header from './Header';

export default () => (
	<>
		<Header />
		<Container>
			<Row className="justify-content-sm-center">
				<Col sm={8} className="docSearch-content">
					<h2>Installation</h2>
					<hr />
					<pre>
						<PrismCode className="language-bash">npm install react-jsonschema-form-validation</PrismCode>
					</pre>
					<pre>
						<PrismCode className="language-bash">yarn add react-jsonschema-form-validation</PrismCode>
					</pre>
					<h2 className="mt-5">Getting started</h2>
					<hr />
					<p>Define a JSON Schema for your form:</p>
					<pre className="mb-4">
						<PrismCode className="language-javascript">
							{`// simpleJsonSchema.js
export default {
	type: 'object',
	properties: {
		email: { type: 'string', format: 'email' },
		name: { type: 'string', maxLength: 30 }
	},
	required: [
		'email',
		'name',
	],
};`}
						</PrismCode>
					</pre>
					<p>Import the Form, Field, FieldError and write your form:</p>
					<pre>
						<PrismCode className="language-jsx">
							{`// GettingStartedForm.js
import React, { useState } from 'react';
import { Field, FieldError, Form } from 'react-jsonschema-form-validation';

import { SubmitButton } from './SubmitButton';
import simpleJsonSchema from './schema';

const GettingStartedForm = () => {
	const [formData, setFormData] = useState({
		email: '',
		name: '',
	});
	const [success, setSuccess] = useState(false);

	const handleChange = (newData) => { setFormData(newData); };
	const handleSubmit = () => { setSuccess(true); };

	return (
		<Form
			data={formData}
			onChange={handleChange}
			onSubmit={handleSubmit}
			schema={simpleJsonSchema}
		>
			<div className="form-group">
				<label htmlFor="client-name">Name:</label>
				<Field
					id="client-name"
					name="name"
					value={formData.name}
				/>
				<FieldError name="name" />
			</div>
			<div className="form-group">
				<label htmlFor="client-email">Email:</label>
				<Field
					id="client-email"
					name="email"
					type="email"
					value={formData.email}
				/>
				<FieldError name="email" />
			</div>
			<SubmitButton />
		</Form>
	);
};
`}
						</PrismCode>
					</pre>
					<p>Use Form Context:</p>
					<pre>
						<PrismCode className="language-jsx">
							{`// SubmitButton.js
import React, { useState } from 'react';
import { useFormContext } from 'react-jsonschema-form-validation';

const SubmitButton = () => {
	const { valid } = useFormContext();

	return (
		<button
			disabled={!valid}
			type="submit"
		>
			Submit
		</button>
	);
};
`}
						</PrismCode>
					</pre>
					<p>More examples can be found here : <Link to="/examples">examples</Link></p>
					<h2 className="mt-5">API</h2>
					<hr />
					<p>
						See details of components props in <Link to="/docs">API docs</Link>
					</p>
					<h2 className="mt-5">Debug</h2>
					<hr />
					<p>
						Set the env variable REACT_APP_JFV_DEBUG to true
					</p>
				</Col>
			</Row>
		</Container>
	</>
);
