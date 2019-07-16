import React, { PureComponent } from 'react';
import { PrismCode } from 'react-prism';
import { Link } from 'react-router-dom';
import {
	Col,
	Container,
	Row,
} from 'reactstrap';


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
								<p className="text-danger">Example</p>
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
							<h4 className="mt-5">• Form</h4>
							<p>Wrapper for html form tag. It support usual html5 props + ours described below</p>
							<p className="lead"><b>required props</b></p>

							<p>
								<mark>data</mark> <i>object</i> <br />
								Object data the user will fill out through the form, and submit for validation
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
									<mark>children</mark>  <i>node</i><br />
									You can pass any sort of data as long as React can understand it before rendering
								</p>
								<p>
									<mark>className</mark> <i>string</i> <br />
									Use your own css classes to customize the component
								</p>
								<p>
									<mark>errorMessages</mark>  <i>object</i> <br />
									Customize global error message, like required property
								</p>
								<pre>
									<PrismCode className="language-javascript">
										{`
// custom-error-form.mesages.js
errorMessages={{
	required: () => 'You must fill out all required fields',
}}
									`}
									</PrismCode>
								</pre>
								<pre className="">
									<p className="text-danger">JSON Schema related</p>
									<PrismCode className="language-jsx">
										{`
// custom-error-form.schema.js
const simpleJsonSchema = {
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
									<p className="text-danger">Form Example</p>
									<PrismCode className="language-jsx">
										{`
<Form
	schema={simpleJsonSchema}
	data={formData}
	onSubmit={this.handleSubmit}
	errorMessages={{
		required: () => 'You must fill out all required fields',
	}}
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
									<p className="text-danger">Default values</p>
									<PrismCode className="language-jsx">
										{`
/*      ***      */
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
							<h4 className="mt-5">• Field</h4>
							<p>
								Wrapper for components. Feel free to use any component you want. <br />
								e.g input, React-Select, Custom component, etc. <br />
								Check out our working examples <Link to="/examples/">here</Link>

							</p>
							<p className="lead"><b>required props</b></p>
							<p>
								<mark>name</mark> <i>string</i><br />
								The name of the input field (should match with the field in your formData)
							</p>
							<p>
								<mark>onChange</mark> <i>function</i><br />
								Your function which handle any change that occur in your component
							</p>
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
									<p className="text-danger">ageCustom Field input</p>
									<PrismCode className="language-jsx">
										{`
// Input component from reactstrap
<Field
	component={Input}
	name="ageCustom"
	onChange={this.handleChange}
	type="number"
	value={formData.ageCustom}
/>
									`}
									</PrismCode>
								</pre>
							</div>
							<h4 className="mt-5">• FieldError</h4>
							<p>
								Component that display errors relative to a  <PrismCode className="language-jsx">{'<Field>'}</PrismCode>
							</p>
							<p className="lead"><b>required props</b></p>
							<p>
								<mark>name</mark> <i>string</i><br /> the name of the related input field
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
									<mark>errorMessages</mark>  <i>object</i> <br />
									Customize every single error message for each input properties
								</p>
								<pre className="mb-4">
									<p className="text-danger">Example</p>
									<PrismCode className="language-jsx">
										{`
errorMessages={{
	enum: () => 'Value does not match any value among those allowed'
	minimum: () => 'You must be over 18',
	maximum: () => 'Too old',
	/*      ***      */
}}
									`}
									</PrismCode>
								</pre>
								<pre>
									<p className="text-danger">Related to ageCustom field input</p>
									<PrismCode className="language-jsx">
										{`
<FieldError name="ageCustom" />
									`}
									</PrismCode>
								</pre>
							</div>
							<h4 className="mt-5">• ErrorMarker</h4>
							<p>
									Using this component you may add one more information when the user does
								not fill out the form correctly. <br />
									It’ll display how many errors encountered during the submit phase. <br />
									Must be placed within the Form component.
								Check out our working example <Link to="/examples/error-marker-form">here</Link>
							</p>
							<div className="facultative-props">
								<p className="lead"><em>facultative props</em></p>
								<p>
									<mark>className</mark> <i>string</i><br />
									Pass any css class you want to be added to the component.
									Use your own css classes to customize the component
								</p>
								<p>
									<mark>color</mark>  <i>string</i><br />
									Default color is danger, a bootstrap color.
								You can specify another one among those of bootstrap. <br />
								</p>
								<p>
									<mark>customtext</mark> <i>string</i><br />
									Add your own message. Number of errors still remains at the start of the string
								</p>
								<p>
									<mark>fade</mark> <i>boolean</i><br />
									Keep/Remove the animation when the component is rendered on screen
									Default is true
								</p>
								<p>
									<mark>isOpen</mark> <i>boolean</i><br />
									Default is true
								</p>
								<p>
									<mark>tag</mark> <i>boolean</i><br />
									Specify a html tag to add into the component
								</p>
								<p>
									<mark>toggle</mark> <i>function</i><br />
									Handle display with a function
								</p>
								<p>
									<mark>transition</mark> <i>object</i><br />
									Controls the transition of the component fading in and out. <br />
									See reactstrap’s <a href="https://reactstrap.github.io/components/fade/">documentation </a> about Fade for more details
								</p>
								<pre>
									<p className="text-danger">Example</p>
									<PrismCode className="language-jsx">
										{`
/* keep in mind that you must put it inside the <Form> ... </Form> */
<ErrorMarker
	color="warning"
	customtext="this is a custom message, with a custom color"
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
