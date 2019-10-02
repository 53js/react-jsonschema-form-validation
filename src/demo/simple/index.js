import React, { PureComponent } from 'react';

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

class SimpleForm extends PureComponent {
	state = {
		formData: {
			email: '',
		},
		success: false,
	}

	handleSubmit = () => {
		this.setState({ success: true });
	}

	handleChange = (newData) => {
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
				<Submit success={success} />
			</Form>
		);
	}
}

export default SimpleForm;
