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
							<p>
								Any <a href="https://standardschema.dev">Standard Schema</a> validator
								(Zod, Valibot, ArkType…) works too: pass the schema object as{' '}
								<PrismCode className="language-jsx">schema</PrismCode> and import from{' '}
								<PrismCode className="language-jsx">react-jsonschema-form-validation/core</PrismCode>{' '}
								to leave AJV out of your bundle. See the README for details.
							</p>
							<h3 className="mt-5">Components</h3>
							<h4 className="mt-5">Form</h4>
							<p>Wrapper for html form tag. It support usual html5 props + ours described below</p>
							<p>
								<PrismCode className="language-jsx">{'<Form>'}</PrismCode> has two modes.{' '}
								<b>Sugar mode</b> (below): pass the schema and the data as props, the form owns
								its state. <b>Hook mode</b>: when the component rendering the form needs{' '}
								<PrismCode className="language-jsx">valid</PrismCode>,{' '}
								<PrismCode className="language-jsx">errors</PrismCode> or{' '}
								<PrismCode className="language-jsx">reset()</PrismCode>, create the form with{' '}
								<PrismCode className="language-jsx">useForm</PrismCode> and pass it through the{' '}
								<PrismCode className="language-jsx">form</PrismCode> prop (see{' '}
								<Link to="/examples/hook-mode">the example</Link>):
							</p>
							<pre className="mb-4">
								<PrismCode className="language-jsx">
									{`
const form = useForm({ schema, data: formData, onChange: handleChange });

<Form form={form} onSubmit={handleSubmit}>
	<Field name="email" value={formData.email} />
	<FieldError name="email" />
	<button type="submit" disabled={!form.valid}>Submit</button>
</Form>
									`}
								</PrismCode>
							</pre>
							<p>
								The two modes are exclusive: <mark>form</mark> cannot be combined with{' '}
								<mark>schema</mark>, <mark>data</mark>, <mark>onChange</mark>,{' '}
								<mark>errorMessages</mark>, <mark>throttleDuration</mark>, <mark>ajv</mark> or{' '}
								<mark>id</mark> (they belong to <PrismCode className="language-jsx">useForm</PrismCode>).
							</p>
							<p className="lead"><b>required props</b> <i>(sugar mode)</i></p>

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
								Pass the JSONSchema you described for your form (or a Standard Schema object). <br />
								Submitted data must match the schema.
							</p>
							<div className="facultative-props">
								<p className="lead"><em>facultative props</em></p>
								<p>
									<mark>ajv</mark> <i>Ajv instance</i><br />
									An Ajv (v8) instance to override the default one if needed — any object
									exposing <PrismCode className="language-jsx">compile(schema)</PrismCode>.
								</p>
								<p>
									<mark>form</mark> <i>FormApi</i><br />
									Hook mode: the form object returned by{' '}
									<PrismCode className="language-jsx">useForm()</PrismCode>.
								</p>
								<p>
									<mark>id</mark> <i>string</i><br />
									The form id (default: React <PrismCode className="language-jsx">useId()</PrismCode>),
									rendered on the form element and used to derive the{' '}
									<PrismCode className="language-jsx">{'<FieldError>'}</PrismCode> ids.
									In hook mode, pass it to <PrismCode className="language-jsx">{'useForm({ id })'}</PrismCode> instead.
								</p>
								<p>
									<mark>resetOnSubmit</mark> <i>boolean</i><br />
									Set it to false to keep the touched/submitted state after a successful submit
									(then call <PrismCode className="language-jsx">form.reset()</PrismCode> yourself). <br />
									Default is true.
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
									<mark>component</mark> <i>elementType</i><br />
									The component to use as form. By default it renders an html form element.
									A custom component must forward the <mark>id</mark> and <mark>onSubmit</mark>{' '}
									props to the element it renders: fields are associated through the native{' '}
									<PrismCode className="language-jsx">form</PrismCode> attribute pointing at that id.
								</p>
								<p>
									<mark>errorMessages</mark>  <i>object</i> <br />
									Customize global error messages, keyed by error code:{' '}
									<PrismCode className="language-jsx">required</PrismCode>,{' '}
									<PrismCode className="language-jsx">type</PrismCode>,{' '}
									<PrismCode className="language-jsx">min</PrismCode>,{' '}
									<PrismCode className="language-jsx">max</PrismCode>,{' '}
									<PrismCode className="language-jsx">minLength</PrismCode>,{' '}
									<PrismCode className="language-jsx">maxLength</PrismCode>,{' '}
									<PrismCode className="language-jsx">pattern</PrismCode>,{' '}
									<PrismCode className="language-jsx">format</PrismCode>,{' '}
									<PrismCode className="language-jsx">enum</PrismCode> — other AJV keywords
									keep their name — plus the <PrismCode className="language-jsx">defaultMessage</PrismCode>{' '}
									catch-all. Each function receives the normalized error{' '}
									<PrismCode className="language-jsx">{'{ field, code, message, params, raw }'}</PrismCode>.
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
									On a failed submit, focus moves to the first invalid field of the form,
									scrolled into view. <br />
									Default is true.
								</p>
								<p>
									<mark>scrollOptions</mark> <i>object</i> <br />
									Options forwarded to the native{' '}
									<PrismCode className="language-jsx">scrollIntoView()</PrismCode>
								</p>
								<pre className="mb-4">
									<PrismCode className="language-jsx">
										{`
// defaults
scrollOptions: {
	behavior: 'smooth',
	block: 'center',
	inline: 'nearest',
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
									<mark>component</mark> <i>elementType</i><br />
									The component to wrap in.
									Default is a html input.
								</p>
								<p>
									<mark>form</mark> <i>FormApi</i><br />
									Explicit association, for a field rendered outside the{' '}
									<PrismCode className="language-jsx">{'<Form>'}</PrismCode> subtree (portal, modal).
									By default the nearest <PrismCode className="language-jsx">{'<Form>'}</PrismCode>{' '}
									ancestor is used; with neither, the component throws.
								</p>
								<p>
									<mark>ref</mark> <i>object or function</i><br />
									Forwarded to the rendered component
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
									<mark>component</mark> <i>elementType</i><br />
									The component to wrap in.
									Default is a html div.
								</p>
								<p>
									<mark>className</mark> <i>string</i><br />
									Pass any css class you want to be added to the component.
									Use your own css classes to customize the component
								</p>
								<p>
									<mark>errorMessages</mark> <i>object</i> <br />
									Customize errors messages for this FieldError only (same keys as the Form prop).
								</p>
								<p>Example:</p>
								<pre className="mb-4">
									<PrismCode className="language-jsx">
										{`
<FieldError
	errorMessages={{
		enum: () => 'Value does not match any value among those allowed',
		min: () => 'You must be over 18',
		max: () => 'Too old',
	}}
	name="ageCustom"
/>
									`}
									</PrismCode>
								</pre>
								<p>
									<mark>form</mark> <i>FormApi</i><br />
									Explicit association, like <PrismCode className="language-jsx">{'<Field form>'}</PrismCode>.
								</p>
								<p>
									<mark>id</mark> <i>string</i><br />
									The DOM id, referenced by the matching Field&apos;s{' '}
									<PrismCode className="language-jsx">aria-describedby</PrismCode>. <br />
									Default is <PrismCode className="language-jsx">{'`${formId}-error-${name}`'}</PrismCode>.
								</p>
							</div>
							<h3 className="mt-5">Hooks</h3>
							<h4 className="mt-5">useForm</h4>
							<p>
								<PrismCode className="language-jsx">{'useForm({ schema, data, onChange, errorMessages, throttleDuration, id, ajv })'}</PrismCode>{' '}
								owns the form state and returns a stable form object to pass to{' '}
								<PrismCode className="language-jsx">{'<Form form={form}>'}</PrismCode>.
								Reactive members: <mark>valid</mark>, <mark>errors</mark>, <mark>touchedFields</mark>,{' '}
								<mark>isSubmitted</mark>, <mark>id</mark>. Imperative API, named after HTMLFormElement:{' '}
								<mark>reset()</mark> (clears the touched/submitted state, keeps errors),{' '}
								<mark>checkValidity()</mark>, <mark>reportValidity()</mark> (reveals the errors and
								focuses the first invalid field), <mark>requestSubmit()</mark>. Field helpers:{' '}
								<mark>getFieldErrors(names)</mark>, <mark>isFieldInvalid(names)</mark>,{' '}
								<mark>isFieldTouched(names)</mark>, <mark>touch(names)</mark>,{' '}
								<mark>handleFieldChange(event | name, value)</mark>.
							</p>
							<h4 className="mt-5">useFormContext</h4>
							<p>
								Returns the form object of the nearest{' '}
								<PrismCode className="language-jsx">{'<Form>'}</PrismCode> ancestor (throws outside
								a form). See <Link to="/examples/context-form">the example</Link>.
							</p>
							<pre className="mb-4">
								<PrismCode className="language-jsx">
									{`
const SubmitIfValid = () => {
	const { valid } = useFormContext();
	return <button type="submit" disabled={!valid}>Submit</button>;
};
									`}
								</PrismCode>
							</pre>
							<h4 className="mt-5">useFormSelector</h4>
							<p>
								<PrismCode className="language-jsx">useFormSelector(form, selector)</PrismCode>{' '}
								subscribes a component to a slice of the form state; it re-renders only when the
								selected value changes.
							</p>
							<pre className="mb-4">
								<PrismCode className="language-jsx">
									{`
const form = useFormContext();
const touchedCount = useFormSelector(form, (state) => state.touchedFields.length);
									`}
								</PrismCode>
							</pre>
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
