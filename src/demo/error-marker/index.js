import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
	Alert,
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

import errorMakerSchema from './error-marker-form.schema';

class ErrorMakerForm extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			formData: {
				lastName: '',
				firstName: '',
				email: '',
				emailVerification: '',
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
		const {
			formData,
			loading,
			success,
		} = this.state;

		return (
			<Form
				data={formData}
				onChange={this.handleChange}
				onSubmit={this.handleSubmit}
				schema={errorMakerSchema}
			>
				<FieldError name="*">
					<Alert color="danger">
						Errors were found in the form. Please fill out all the required fields.
					</Alert>
				</FieldError>
				<FieldError name="email*">
					<Alert color="warning">
						Errors were found in emails. Please correct your unbelievable mistakes!
					</Alert>
				</FieldError>
				<FormGroup className="row">
					<Label className="col-md-4" htmlFor="client-lastName">Last Name:</Label>
					<Col md="6">
						<Field
							component={Input}
							id="client-lastName"
							name="lastName"
							type="input"
							value={formData.lastName}
						/>
						<FieldError name="lastName" />
					</Col>
				</FormGroup>
				<FormGroup className="row">
					<Label className="col-md-4" htmlFor="client-firstname">First Name (not required):</Label>
					<Col md="6">
						<Field
							component={Input}
							id="client-firstName"
							name="firstName"
							type="input"
							value={formData.firstName}
						/>
						<FieldError name="firstName" />
					</Col>
				</FormGroup>
				<FormGroup className="row">
					<Label className="col-md-4" htmlFor="client-email">Email :</Label>
					<Col md="6">
						<Field
							component={Input}
							id="client-email"
							name="email"
							type="input"
							value={formData.email}
						/>
						<FieldError name="email" />
					</Col>
				</FormGroup>
				<FormGroup className="row">
					<Label className="col-md-4" htmlFor="client-emailVerification">Email verification :</Label>
					<Col md="6">
						<Field
							component={Input}
							id="client-emailVerification"
							name="emailVerification"
							type="input"
							value={formData.emailVerification}
						/>
						<FieldError name="emailVerification" />
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

export default ErrorMakerForm;
