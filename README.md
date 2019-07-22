# React JSON Schema Form Validation

[![npm](http://img.shields.io/npm/v/react-jsonschema-form-validation.svg?style=flat)](https://npmjs.org/package/react-jsonschema-form-validation "View this project on npm") 
[![Code Climate coverage](https://img.shields.io/codeclimate/coverage/53js/react-jsonschema-form-validation.svg)](https://codeclimate.com/github/53js/react-jsonschema-form-validation "CodeClimate coverage") 
[![CircleCI](https://img.shields.io/circleci/build/github/53js/react-jsonschema-form-validation.svg)](https://circleci.com/gh/53js/react-jsonschema-form-validation "CircleCI") 
[![Code Climate maintainability](https://img.shields.io/codeclimate/maintainability/53js/react-jsonschema-form-validation.svg)](https://codeclimate.com/github/53js/react-jsonschema-form-validation "CodeClimate maintainability") 
[![MIT](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT) 

Validate forms with powerful JSON Schema and Ajv !

This library links JSON Schema, Ajv and Form to :
- describe data model with JSON Schema
- validate the form data with Ajv
- display & customize error messages
- use your own graphical components to build friendly user forms.

## Why RJFV ?
- Simplicity (no extraneous features, just what you need)
- Performance (AJV is extremely fast _:zap:_)
- Actively maintained
- The simplest react JSON Schema validation module ever published on npm ! :v:

Other JSON Schema validation modules published on NPM are often complex, with too much features.
That's why we created react-jsonschema-form-validation. 
You'll just need a schema, a form, some fields, and your data. Nothing more. <i class="fa fa-arrow-right"></i> it's S I M P L E

Our philosophy :
- focused on validation, not UI    
- highly customizable
- minimal CSS (15 lines) : just a red color to show error message (can be overriden)

## Installation

```bash
npm install react-jsonschema-form-validation
```

```bash
yarn add react-jsonschema-form-validation
```

## Getting started

First define your JSON Schema :

```js
const demoSchema = {
	type: 'object',
	properties: {
		email: { type: 'string', format: 'email' },
	},
	required: [
		'email',
	],
};
```

Then import modules :
```js
import React from 'react';
import { Field, FieldError, Form } from 'react-jsonschema-form-validation';

// ...
```

Then declare your __Form__, __Field__ and __FieldError__ components.
Pass your schema to the Form props.

```jsx
class DemoForm extends PureComponent {
	// ...
	state = {
		formData: {
			email: '',
		},
	}
	
	handleChange = (data) => {
		// data is a copy of the object formData with properties (and nested properties)
		// updated using immutability pattern for each change occured in the form.
		this.setState({ formData: data });
	}
	
	handleSubmit = () => {
		const { doWhateverYouWant } = this.props;
		const { formData } = this.state;
		doWhateverYouWant(formData); // Do whatever you want with the form data
	}

	render() {
		<Form
			data={this.state.formData}
			onChange={this.handleChange}
			onSubmit={this.handleSubmit}
			schema={demoSchema}
		>
			<label>Email :</label>
			<Field
				name="email"
				value={formData.email}
			/>
			<FieldError name="email" />
			<button type="submit">Submit</button>
		</Form>
	}
}
```

🎵 _That's all folks !_ 

### Examples
We’ve got many examples, from the most simple to the most advanced.

Live examples are available : [here](https://53js.github.io/react-jsonschema-form-validation/#/examples/ "examples")

## Documentation

📃 Check out our documentation : [here](https://53js.github.io/react-jsonschema-form-validation "documentation")

## Licence

MIT

## About us

📬 contact : contact@53js.fr

follow us : [@53jsdev](https://twitter.com/53jsdev "https://twitter.com/53jsdev")

github repos : [/53js](https://github.com/53js "https://github.com/53js")

🚀 website : [53js.fr](https://53js.fr "https://www.53js.fr")
