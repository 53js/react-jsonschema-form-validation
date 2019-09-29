import React from 'react';

import {
	Field,
	FieldError,
	Form,
} from '../../lib';

import SubmitIfValid from './SubmitIfValid';

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
		this.setState((state) => ({ ...state, success: true }));
	}

	handleChange(newData) {
		this.setState({
			formData: newData,
			success: false,
		});
	}

	render() {
		const {
			formData,
			success,
		} = this.state;

		return (
			<Form
				data={formData}
				onChange={this.handleChange}
				onSubmit={this.handleSubmit}
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
				<SubmitIfValid success={success} />
			</Form>
		);
	}
}

export default SimpleForm;
