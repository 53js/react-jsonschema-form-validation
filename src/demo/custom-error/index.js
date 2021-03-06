import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
	Col,
	FormGroup,
	Input,
	Label,
	Row,
} from 'reactstrap';


import {
	Field,
	FieldError,
	Form,
} from '../../lib';

import Submit from '../components/Submit';
import customErrorFormSchema from './custom-error-form.schema';
import { defaultMessage, minAgeCustomMessage, maxAgeCustomMessage } from './custom-error-form.messages';

class CustomMessageForm extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			formData: {
				ageCustom: '',
				defaultMessage,
				minAgeCustomMessage,
				maxAgeCustomMessage,
			},
			success: false,
			loading: false,
		};
		this.handleChange = this.handleChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleChange(data) {
		this.setState({ formData: data, success: false });
	}

	handleSubmit() {
		this.setState({ loading: true });
		setTimeout(() => {
			this.setState({ loading: false, success: true });
		}, 1500);
	}

	render() {
		const { formData, loading, success } = this.state;

		return (
			<Form
				schema={customErrorFormSchema}
				data={formData}
				onChange={this.handleChange}
				onSubmit={this.handleSubmit}
				errorMessages={{
					required: () => formData.defaultMessage,
				}}
			>
				<FormGroup className="row">
					<Label className="col-md-4" htmlFor="client-minAgeCustomMessage">minimum age error message</Label>
					<Col md="6">
						<Field
							component={Input}
							id="client-minAgeCustomMessage"
							name="minAgeCustomMessage"
							type="text"
							value={formData.minAgeCustomMessage}
						/>
					</Col>
				</FormGroup>
				<FormGroup className="row">
					<Label className="col-md-4" htmlFor="client-maxAgeCustomMessage">maximum age error message</Label>
					<Col md="6">
						<Field
							component={Input}
							id="client-maxAgeCustomMessage"
							name="maxAgeCustomMessage"
							type="text"
							value={formData.maxAgeCustomMessage}
						/>
					</Col>
				</FormGroup>
				<FormGroup className="row mb-5">
					<Label className="col-md-4" htmlFor="client-defaultMessage">required message error</Label>
					<Col md="6">
						<Field
							component={Input}
							id="client-defaultMessage"
							name="defaultMessage"
							type="text"
							value={formData.defaultMessage}
						/>
					</Col>
				</FormGroup>
				<hr />
				<FormGroup className="row mt-5">
					<Label className="col-md-4" htmlFor="client-ageCustom">Age with custom error messages</Label>
					<Col md="6">
						<Field
							component={Input}
							id="client-ageCustom"
							name="ageCustom"
							type="number"
							value={formData.ageCustom}
						/>
						<FieldError
							errorMessages={{
								minimum: () => formData.minAgeCustomMessage,
								maximum: () => formData.maxAgeCustomMessage,
							}}
							name="ageCustom"
						/>
					</Col>
				</FormGroup>
				<Row className="mb-4">
					<Col md="10" className="text-center">
						<Submit loading={loading} success={success} />
					</Col>
				</Row>
			</Form>
		);
	}
}

export default CustomMessageForm;
