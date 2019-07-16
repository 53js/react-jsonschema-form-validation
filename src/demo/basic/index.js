import React from 'react';
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

import simpleJsonSchema from './basic-form.schema';

class BasicForm extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			formData: {
				lastName: '',
				firstName: '',
			},
			success: false,
			loading: false,
		};

		this.handleChange = this.handleChange.bind(this);
		this.handleChangeInterests = this.handleChangeInterests.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleChange(e) {
		let value;
		const { target } = e;
		const { name } = target;
		let { formData } = this.state;

		switch (target.type) {
		case 'checkbox':
			value = !!target.checked;
			break;
		case 'number':
			value = target.value !== '' ? +target.value : '';
			break;
		default:
			// eslint-disable-next-line
			value = target.value;
		}

		formData = { ...formData, [name]: value };

		this.setState({ formData, success: false });
	}

	handleChangeInterests(e) {
		const { target } = e;
		const { name } = target;
		const { formData } = this.state;
		let { interests } = formData;

		interests = interests || [];

		if (target.checked) {
			interests = [...interests, target.value];
		} else {
			interests = interests.filter(v => v !== target.value);
		}

		this.handleChange({
			target: {
				name,
				value: interests,
			},
		});
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
				schema={simpleJsonSchema}
				data={formData}
				onSubmit={this.handleSubmit}
			>
				<FormGroup className="row">
					<Label className="col-md-4" htmlFor="client-lastName">Last Name :</Label>
					<Col md="6">
						<Field
							component={Input}
							id="client-lastName"
							name="lastName"
							onChange={this.handleChange}
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
							onChange={this.handleChange}
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
							onChange={this.handleChange}
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
							onChange={this.handleChange}
							type="input"
							value={formData.emailVerification}
						/>
						<FieldError name="emailVerification" />
					</Col>
				</FormGroup>
				<FormGroup className="row">
					<Label className="col-md-4" htmlFor="client-age">Age {'( 18 < age < 100)'}</Label>
					<Col md="6">
						<Field
							component={Input}
							id="client-age"
							name="age"
							onChange={this.handleChange}
							type="number"
							value={formData.age}
						/>
						<FieldError name="age" />
					</Col>
				</FormGroup>
				<FormGroup className="row">
					<Label className="col-md-4" htmlFor="client-ageCustom">Age with custom error message</Label>
					<Col md="6">
						<Field
							component={Input}
							id="client-ageCustom"
							name="ageCustom"
							onChange={this.handleChange}
							type="number"
							value={formData.ageCustom}
						/>
						<FieldError
							name="ageCustom"
							errorMessages={{
								minimum: () => 'Too young sorry',
							}}
						/>
					</Col>
				</FormGroup>
				<FormGroup className="row">
					<Label className="col-md-4">Interests</Label>
					<Col md="6">
						<ul>
							<li>
								<Label>
									<Field
										component={Input}
										name="interests"
										onChange={this.handleChangeInterests}
										type="checkbox"
										value="cinema"
										checked={(formData.interests || []).indexOf('cinema') > -1}
									/>
									&nbsp;Cinéma
								</Label>
							</li>
							<li>
								<Label>
									<Field
										component={Input}
										name="interests"
										onChange={this.handleChangeInterests}
										type="checkbox"
										value="sport"
										checked={(formData.interests || []).indexOf('sport') > -1}
									/>
									&nbsp;Sport
								</Label>
							</li>
						</ul>
						<FieldError name="interests" />
					</Col>
				</FormGroup>
				<FormGroup className="row">
					<Label className="col-md-4">Gender</Label>
					<Col md="6">
						<ul>
							<li>
								<Label>
									<Field
										component={Input}
										name="gender"
										onChange={this.handleChange}
										type="radio"
										value="male"
										checked={formData.gender === 'male'}
									/>
									&nbsp;Male
								</Label>
							</li>
							<li>
								<Label>
									<Field
										component={Input}
										name="gender"
										onChange={this.handleChange}
										type="radio"
										value="female"
										checked={formData.gender === 'female'}
									/>
									&nbsp;Female
								</Label>
							</li>
						</ul>
						<FieldError name="gender" />
					</Col>
				</FormGroup>
				<FormGroup className="row">
					<Label className="col-md-4">Did you read entirely the CGUs ?</Label>
					<Col md="6">
						<Label>
							<Field
								component={Input}
								name="cgu"
								onChange={this.handleChange}
								type="checkbox"
								checked={formData.cgu}
							/>
							&nbsp;Yes, loved it !
						</Label>
						<FieldError name="cgu" />
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

export default BasicForm;
