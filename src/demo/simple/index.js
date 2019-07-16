import React from 'react';

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

class SimpleForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			formData: {
				email: '',
			},
			success: false,
		};

		this.handleChange = this.handleChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit() {
		this.setState(state => ({ ...state, success: true }));
	}

	handleChange(e) {
		const { target } = e;
		const { name, value } = target;
		let { formData } = this.state;
		formData = { ...formData, [name]: value };
		this.setState(state => ({
			...state,
			formData,
			success: false,
		}));
	}

	render() {
		const {
			formData,
			success,
		} = this.state;

		return (
			<Form
				data={formData}
				onSubmit={this.handleSubmit}
				schema={simpleJsonSchema}
			>
				<div className="form-group">
					<label>Email :</label>
					<Field
						className="form-control"
						name="email"
						onChange={this.handleChange}
						value={formData.email}
					/>
					<FieldError name="email" />
				</div>
				<Submit success={success} />
			</Form>
		);
	}
}

export default SimpleForm;
