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
					<p>Define a JSON Schema for your form</p>
					<pre className="mb-4">
						<PrismCode className="language-javascript">
							{`const simpleJsonSchema = {
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

					<p>Import the Form, Field, FieldError and write your form</p>


					{/*<div className="docs-example">a</div>*/}
					<pre>
						<PrismCode className="language-jsx">
							{`import React from 'react';
import { Field, FieldError, Form } from 'react-jsonschema-form-validation';


/* ... */
	state = {
		formData: {
			email: '',
			name: '',
		},
	}

	handleChange = (data) => {
		this.setState({ formData: data });
	}

	render() {
		return (
			<Form
				data={this.state.formData}
				onChange={this.handleChange}
				onSubmit={this.handleSubmit}
				schema={simpleJsonSchema}
			>
				<div className="form-group">
					<label htmlFor="client-name">Name :</label>
					<Field
						id="client-name"
						name="name"
						value={this.state.formData.name}
					/>
					<FieldError name="name" />
				</div>
				<div className="form-group">
					<label htmlFor="client-email">Email :</label>
					<Field
						id="client-email"
						name="email"
						type="email"
						value={this.state.formData.email}
					/>
					<FieldError name="email" />
				</div>
				<button type="submit">
					Submit
				</button>
			</Form>
		);

							`}
						</PrismCode>
					</pre>
					<p>This example can be found here : <Link to="/examples/simple">example</Link></p>
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
