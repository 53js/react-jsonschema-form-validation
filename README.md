# React JSON Schema Form Validation

[![npm](http://img.shields.io/npm/v/react-jsonschema-form-validation.svg?style=flat)](https://npmjs.org/package/react-jsonschema-form-validation "View this project on npm") 
[![MIT](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT) 

Validate forms with powerful JSON Schema and Ajv !

This library links JSON Schema, Ajv and Form to :
- describe data model with JSON Schema
- validate the form data with Ajv
- display & customize error messages
- use your own graphical components to build friendly user forms.

## Why us ?
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

Then import as ES6 Module :
```js
import React from 'react';
import { Field, FieldError, Form } from 'react-jsonschema-form-validation';

// ...
```
Then declare your __Form__, __Field__ and __FieldError__ components.
Pass your schema to the Form as props.
```js
// ...
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
</Form>
```
At last, put a submit button inside your Form.  

```js
		***
	<button>Submit</button>
</Form>
```

🎵 _That's all folks !_ 

#### Let's recap 

```js
import { Field, FieldError, Form } from 'react-jsonschema-form-validation';

// ...
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
	<button>Save</button> 
</Form>
```

### Examples
We’ve got many examples, from the most simple to the most advanced.

Live examples are available : [here](https://53js.github.io/react-jsonschema-form-validation "examples")

## Documentation

📃 Check out our documentation : [here](https://53js.github.io/react-jsonschema-form-validation "documentation")

## Licence

MIT

## About us

📬 contact : contact@53js.fr

follow us : [@53jsdev](https://twitter.com/53jsdev "https://twitter.com/53jsdev")

github repos : [/53js](https://github.com/53js "https://github.com/53js")


🚀 website : [53js.fr](https://53js.fr "https://www.53js.fr")
