import Ajv from 'ajv';
import classnames from 'classnames';
import throttle from 'lodash.throttle';
import memoize from 'memoize-one';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import scrollToElement from 'scroll-to-element';

import Context from './Context';
import {
	createAjv,
	filterByFieldNameWithWildcard,
	formatData,
	formatErrors,
	updateDataFromEvents,
} from './helpers';

// eslint-disable-next-line react/jsx-props-no-spreading
const DefaultFormComponent = (props) => <form noValidate {...props} />;

const initialState = {
	errors: [],
	isSubmitted: false,
	touchedFields: [],
	valid: true,
};

class Form extends PureComponent {
	state = { ...initialState }

	memoGetClassnames = memoize((className, isSubmitted) => classnames(
		'Jfv_Form',
		className,
		{ isSubmitted },
	))

	memoGetContext = memoize((state, errorMessages) => ({
		...state,
		errorMessages,
		getFieldErrors: this.getFieldErrors,
		handleFieldChange: this.handleFieldChange,
		isFieldTouched: this.isFieldTouched,
		isFieldInvalid: this.isFieldInvalid,
		isTouched: this.isTouched,
		touch: this.touch,
	}))

	memoGetValidator = memoize((ajv, schema, throttleDuration) => {
		const validate = ajv.compile(schema);

		const validator = (data) => {
			const formattedData = formatData(data);
			const valid = validate(formattedData);
			const errors = formatErrors(validate.errors);

			this.setState({
				valid,
				errors,
			});
		};

		if (this.throttledValidator) this.throttledValidator.cancel();
		this.throttledValidator = throttle(validator, throttleDuration);

		return memoize(this.throttledValidator);
	})

	componentDidMount() {
		this.validate();
	}

	componentDidUpdate() {
		this.validate();
	}

	componentWillUnmount() {
		if (this.throttledValidator) this.throttledValidator.cancel();
	}

	getClassnames = () => {
		const { className } = this.props;
		const { isSubmitted } = this.state;

		return this.memoGetClassnames(
			className,
			isSubmitted,
		);
	}

	getContext = () => {
		const { errorMessages } = this.props;
		return this.memoGetContext(this.state, errorMessages);
	}

	getFieldErrors = (fieldNames) => {
		fieldNames = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
		const { errors } = this.state;

		return fieldNames.reduce((fieldsErrors, fieldName) => [
			...fieldsErrors,
			...filterByFieldNameWithWildcard(errors, fieldName),
		], []);
	}

	getValidator = () => {
		const {
			ajv,
			schema,
			throttleDuration,
		} = this.props;
		return this.memoGetValidator(ajv, schema, throttleDuration);
	}

	handleFieldChange = (event, value) => {
		const { data, onChange } = this.props;
		if (onChange) {
			if (typeof event === 'string') {
				event = {
					target: {
						name: event,
						value,
					},
				};
			}
			const newData = updateDataFromEvents(data, event);
			onChange(newData, event);
		}
	}

	handleSubmit = (event) => {
		event.preventDefault();
		this.submit(event);
	}

	handleSubmitError = () => {
		const { scrollToError } = this.props;
		const { errors } = this.state;
		if (process.env.REACT_APP_JFV_DEBUG === 'true') console.log(errors); // eslint-disable-line no-console
		if (scrollToError) this.scrollToFirstError();
	}

	handleSubmitSuccess = (event) => {
		const { onSubmit } = this.props;
		this.reset();
		onSubmit(event);
	}

	isFieldInvalid = (fieldNames) => {
		fieldNames = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
		return this.getFieldErrors(...fieldNames).length > 0;
	}

	isFieldTouched = (fieldNames) => {
		fieldNames = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
		const { touchedFields } = this.state;
		return !!fieldNames.find((fieldName) => (
			filterByFieldNameWithWildcard(touchedFields.map((field) => ({ field })), fieldName).length > 0
		));
	}

	isTouched = () => {
		const { touchedFields } = this.state;
		return !!touchedFields.length;
	}

	reset = () => this.setState(initialState)

	scrollToFirstError = () => {
		const { scrollOptions } = this.props;
		const { errors } = this.state;
		const firstError = errors[0];
		const element = document.getElementsByName(firstError.field)[0];
		scrollToElement(element, scrollOptions);
	}

	submit = (event) => {
		const { valid } = this.state;

		this.setState({ isSubmitted: true });

		if (valid) this.handleSubmitSuccess(event);
		else this.handleSubmitError();
	}

	touch = (fieldNames) => {
		fieldNames = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
		const { touchedFields } = this.state;
		this.setState({
			touchedFields: [
				...new Set([
					...touchedFields,
					...fieldNames,
				]),
			],
		});
	}

	validate = () => {
		const { data } = this.props;
		const validate = this.getValidator();
		validate(data);
	}

	render() {
		const {
			ajv,
			children,
			className,
			component: FormComponent,
			data,
			throttleDuration,
			errorMessages,
			onChange,
			onSubmit,
			schema,
			scrollOptions,
			scrollToError,
			...props
		} = this.props;

		return (
			<Context.Provider value={this.getContext()}>
				<FormComponent
					className={this.getClassnames()}
					onSubmit={this.handleSubmit}
					// eslint-disable-next-line react/jsx-props-no-spreading
					{...props}
				>
					{ children }
				</FormComponent>
			</Context.Provider>
		);
	}
}

Form.propTypes = {
	ajv: PropTypes.instanceOf(Ajv),
	children: PropTypes.node,
	className: PropTypes.string,
	component: PropTypes.elementType,
	data: PropTypes.shape({}),
	throttleDuration: PropTypes.number,
	errorMessages: PropTypes.shape({}),
	onChange: PropTypes.func,
	onSubmit: PropTypes.func.isRequired,
	schema: PropTypes.shape({}).isRequired,
	scrollToError: PropTypes.bool,
	scrollOptions: PropTypes.shape({}),
};

Form.defaultProps = {
	ajv: createAjv(),
	children: null,
	className: '',
	component: DefaultFormComponent,
	data: {},
	errorMessages: {},
	onChange: null,
	scrollToError: true,
	scrollOptions: {
		offset: 0,
		align: 'middle',
		duration: 900,
	},
	throttleDuration: 200,
};

export default Form;
