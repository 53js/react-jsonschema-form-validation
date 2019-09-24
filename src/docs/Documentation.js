import React, { PureComponent } from 'react';
/* eslint-disable import/no-extraneous-dependencies */
import { PrismCode } from 'react-prism';
import { Link } from 'react-router-dom';
import {
	Col,
	Container,
	Row,
} from 'reactstrap';
/* eslint-enable import/no-extraneous-dependencies */

import Header from './Header';

import './Documentation.css';
import './prism.css';

class Documentation extends PureComponent {
	render() {
		return (
			<>
				<Header />
				<Container>
					<Row className="justify-content-sm-center">
						<Col sm={8} className="docSearch-content">
							<h2>Documentation</h2>
							<hr />
							<h3 className="mt-5">JSON Schema</h3>
							<p>
								Describes your existing data format(s) using JSONSchema vocabulary.<br />
								<i>More details about JSONSchema ? check out <a href="https://json-schema.org/understanding-json-schema/">here</a></i>
							</p>
							<pre>
								<PrismCode className="language-jsx">
									{`
// basic-form.schema.js
{
	type: 'object',
	properties: {
		age: { type: 'integer', minimum: 18, maximum: 100 },
		ageCustom: { type: 'number', minimum: 18, maximum: 100 },
		cgu: { type: 'boolean', enum: [true] },
		email: { type: 'string', format: 'email' },
		emailVerification: {
			type: 'string',
			format: 'email',
			const: { $data: '1/email'},
		},
		gender: { type: 'string', enum: ['male', 'female'] },
		firstName: { type: 'string' },
		interests: { type: 'array', minItems: 1 },
		lastName: { type: 'string', minLength: 1 },
	},
	required: [
		'age',
		'cgu',
		'email',
		'emailVerification',
		'interests',
		'lastName',
	],
}
									`}
								</PrismCode>
							</pre>
							<h3 className="mt-5">Components</h3>
							<h4 className="mt-5">Form</h4>
							<p>Wrapper for html form tag. It support usual html5 props + ours described below</p>
							<p className="lead"><b>required props</b></p>

							<p>
								<mark>data</mark> <i>object</i> <br />
								Object data the user will fill out through the form, and submit for validation
							</p>
							<p>
								<mark>onChange</mark> <i>function(data, event)</i> <br />
								It is called with the updated data object. Use it to update the form data{' '}
								(which may be stored in the state of your component).<br />
								The second argument is the original event.
							</p>
							<p>
								<mark>onSubmit</mark> <i>function</i> <br />
								Your function which handle the submit
							</p>
							<p>
								<mark>schema</mark> <i>object</i> <br />
								Pass the JSONSchema you described for your form. <br />
								Submitted data must match the schema.
							</p>
							<div className="facultative-props">
								<p className="lead"><em>facultative props</em></p>
								<p>
									<mark>ajv</mark> <i>Ajv instance</i><br />
									An Ajv instance to override the default one if needed.
								</p>
								<p>
									<mark>children</mark> <i>node</i><br />
									You can pass any sort of data as long as React can understand it before rendering
								</p>
								<p>
									<mark>className</mark> <i>string</i> <br />
									Use your own css classes to customize the component
								</p>
								<p>
									<mark>component</mark> <i>node</i><br />
									The component to use as form. By default it renders an html form element.
								</p>
								<p>
									<mark>errorMessages</mark>  <i>object</i> <br />
									Customize global error message, like required property
								</p>
								<p>Example:</p>
								<pre>
									<PrismCode className="language-javascript">
										{`
// custom-error-form.messages.js
export default messages = {
	required: () => 'You must fill out all required fields',
}
									`}
									</PrismCode>
								</pre>
								<pre>
									<PrismCode className="language-jsx">
										{`
// custom-error-form.schema.js
export default schema = {
	type: 'object',
	properties: {
		ageCustom: { type: 'integer', minimum: 18, maximum: 100 },
	},
	required: [
		'ageCustom',
	],
};
									`}
									</PrismCode>
								</pre>
								<pre className="mb-4">
									<PrismCode className="language-jsx">
										{`
import messages from './custom-error-form.messages';
import schema from './custom-error-form.schema';

// ...

<Form
	schema={schema}
	data={formData}
	onChange={this.handleChange}
	onSubmit={this.handleSubmit}
	errorMessages={messages}
>
									`}
									</PrismCode>
								</pre>
								<p>
									<mark>scrollToError</mark> <i>boolean</i> <br />
									The page will scroll to the first error encountered in the form. <br />
									Default is true.
								</p>
								<p>
									<mark>scrollOptions</mark> <i>object</i> <br />
									You can customize the scrolling options
								</p>
								<pre className="mb-4">
									<PrismCode className="language-jsx">
										{`
// defaults
scrollOptions: {
	offset: 0,
	align: 'middle',
	duration: 900,
},
									`}
									</PrismCode>
								</pre>
								<p>
									<mark>throttleDuration</mark> <i>number</i><br />
									Limits the number of calls to the function between a specified interval. <br />
									Default is 200ms.
								</p>
							</div>
							<h4 className="mt-5">Field</h4>
							<p>
								Wrapper for components. Feel free to use any component you want. <br />
								e.g input, React-Select, Custom component, etc. <br />
								Check out our working examples <Link to="/examples/">here</Link>
							</p>
							<p className="lead"><b>required props</b></p>
							<p>
								<mark>name</mark> <i>string</i><br />
								The name of the input field (should match with the field in your formData).
								<br />
								<u>Nested properties:</u><br />
								Use the dot notation to link nested properties of form data:<br />
								<PrismCode className="language-jsx">{`"user.name"`}</PrismCode><br />
								<u>Array elements:</u><br />
								Use also the dot notation to link array elements with the Field:<br />
								<PrismCode className="language-jsx">{`"addresses.0.zipCode"`}</PrismCode>
							</p>
							<p>
								<mark>onChange</mark> <i>function(event, handleFieldChange)</i><br />
								Your function which handle any change that occur in your component.<br />
								If you want to trigger the onChange event of the Form to update your{' '}
								form data, you must call with an event-like object the callback{' '}
								<b>handleFieldChange</b> passed in second argument.<br />
								<br />
								<u>[event-like object]</u><br />
								It can be an (or an array of) event-like object with the following properties:<br />
							</p>
							<pre>
								<PrismCode className="language-js">
									{`
const event = {
	target: {
		name: 'email',
		value: 'test@test.com',
	},
};
									`}
								</PrismCode>
							</pre>
							<p>
								Example:<br />
							</p>
							<pre>
								<PrismCode className="language-js">
									{`
function handleChange(event, handleFieldChange) {
	const lowercaseEvent = {
		...event,
		target: {
			...event.target,
			value: (event.target.value || '').toLowerCase(),
		},
	};
	handleFieldChange(lowercaseEvent);
}
									`}
								</PrismCode>
							</pre>
							<p>
								<mark>value</mark> <br />
								Input value displayed
							</p>
							<div className="facultative-props">
								<p className="lead"><em>facultative props</em></p>
								<p>
									<mark>children</mark>  <i>node</i><br />
									You can pass any sort of data as long as React can understand it before rendering
								</p>
								<p>
									<mark>className</mark> <i>string</i><br />
									Use your own css classes to customize the component
								</p>
								<p>
									<mark>component</mark> <i>object</i><br />
									The component to wrap in.
									Default is a html input.
								</p>
								<p>
									<mark>forwardedRef</mark> <i>object or function</i><br />
									Automatically pass a ref through a component to one of its children
								</p>
								<p>
									<mark>type</mark> <i>string</i> -
									<i> (only for Input component) <br />
									</i> the type of your Input component <br />
									Default is text. <br />
									<a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#Form_%3Cinput%3E_types">List of types</a>
								</p>
								<pre>
									<PrismCode className="language-jsx">
										{`
// Input component from reactstrap
<Field
	component={Input}
	name="ageCustom"
	type="number"
	value={formData.ageCustom}
/>
									`}
									</PrismCode>
								</pre>
							</div>
							<h4 className="mt-5">FieldError</h4>
							<p>
								Component that display errors relative to a  <PrismCode className="language-jsx">{'<Field>'}</PrismCode>
							</p>
							<p className="lead"><b>required props</b></p>
							<p>
								<mark>name</mark> <i>string</i><br /> the name of the related input field
								<br />
								<u>Nested properties and array elements:</u><br />
								Use the dot notation like in Field usage. See Field for details.<br />
								<u>Getting errors of multiple elements:</u><br />
								Examples:<br />
								<b>Using array:</b> <PrismCode className="language-jsx">{`name={['email', 'emailConfirmation']}`}</PrismCode><br />
								<b>Using wildcards:</b> <PrismCode className="language-jsx">{`name="email*"`}</PrismCode><br />
								<b>Using both:</b> <PrismCode className="language-jsx">{`name={['email', 'addresses*']}`}</PrismCode><br />
							</p>
							<p className="lead"><em>facultative props</em></p>
							<div className="facultative-props">
								<p>
									<mark>children</mark>  <i>node</i><br />
									Children will replace error message. Useful for displaying exclamation mark
								</p>
								<p>
									<mark>className</mark> <i>string</i><br />
									Pass any css class you want to be added to the component.
									Use your own css classes to customize the component
								</p>
								<p>
									<mark>errorMessages</mark> <i>object</i> <br />
									Customize errors messages for this FieldError only.
								</p>
								<p>Example:</p>
								<pre className="mb-4">
									<PrismCode className="language-jsx">
										{`
<FieldError
	errorMessages={{
		enum: () => 'Value does not match any value among those allowed'
		minimum: () => 'You must be over 18',
		maximum: () => 'Too old',
	}}
	name="ageCustom"
/>
									`}
									</PrismCode>
								</pre>
							</div>
						</Col>
					</Row>
				</Container>
			</>
		);
	}
}

Documentation.propTypes = {

};

export default Documentation;
