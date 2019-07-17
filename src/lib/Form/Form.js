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

class Form extends PureComponent {
	constructor(props) {
		super(props);

		const defaultAjv = props.ajv || createAjv();

		this.getValidator = memoize((ajv, schema, throttleDuration) => {
			ajv = ajv || defaultAjv;
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
		});

		this.handleSubmit = this.handleSubmit.bind(this);

		/* eslint-disable react/no-unused-state */
		this.state = {
			errors: [],
			errorMessages: props.errorMessages,
			getFieldErrors: this.getFieldErrors.bind(this),
			handleFieldChange: this.handleFieldChange.bind(this),
			isFieldTouched: this.isFieldTouched.bind(this),
			isFieldInvalid: this.isFieldInvalid.bind(this),
			isInvalid: this.isInvalid.bind(this),
			isSubmitted: false,
			isTouched: this.isTouched.bind(this),
			touch: this.touch.bind(this),
			touchedFields: [],
			valid: true,
		};
		/* eslint-enable react/no-unused-state */
	}

	componentDidMount() {
		const { ajv, data, schema } = this.props;
		const validate = this.getValidator(ajv, schema);
		validate(data);
	}

	componentDidUpdate() {
		const { ajv, data, schema } = this.props;
		const validate = this.getValidator(ajv, schema);
		validate(data);
	}

	componentWillUnmount() {
		if (this.throttledValidator) this.throttledValidator.cancel();
	}

	getFieldErrors(fieldNames) {
		fieldNames = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
		const { errors } = this.state;

		return fieldNames.reduce((fieldsErrors, fieldName) => [
			...fieldsErrors,
			...filterByFieldNameWithWildcard(errors, fieldName),
		], []);
	}

	handleFieldChange(event, value) {
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

	handleSubmit(event) {
		event.preventDefault();
		this.submit(event);
	}

	scrollToFirstError() {
		const { scrollOptions } = this.props;
		const { errors } = this.state;
		const firstError = errors[0];
		const element = document.getElementsByName(firstError.field)[0];

		scrollToElement(element, scrollOptions);
	}

	submit(event) {
		const {
			onSubmit,
			scrollToError,
		} = this.props;

		const {
			errors,
			valid,
		} = this.state;

		this.setState({ isSubmitted: true });

		if (valid) {
			this.reset();
			onSubmit(event);
		} else if (errors.length) {
			if (process.env.REACT_APP_JFV_DEBUG === 'true') console.log(errors); // eslint-disable-line no-console
			if (scrollToError) {
				this.scrollToFirstError();
			}
		}
	}

	isFieldTouched(fieldNames) {
		fieldNames = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
		const { touchedFields } = this.state;
		return !!fieldNames.find(fieldName => (
			filterByFieldNameWithWildcard(touchedFields.map(field => ({ field })), fieldName).length > 0
		));
	}

	isTouched() {
		const { touchedFields } = this.state;
		return !!touchedFields.length;
	}

	isFieldInvalid(fieldNames) {
		fieldNames = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
		return this.getFieldErrors(...fieldNames).length > 0;
	}

	isInvalid() {
		const { errors } = this.state;
		return !!errors.length;
	}

	reset() {
		this.setState({
			isSubmitted: false,
			touchedFields: [],
		});
	}

	touch(fieldNames) {
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
			...rest
		} = this.props;

		const { isSubmitted } = this.state;

		const classes = classnames(
			className,
			{ isSubmitted },
		);

		return (
			<Context.Provider value={this.state}>
				<FormComponent
					className={classes}
					onSubmit={this.handleSubmit}
					noValidate
					{...rest}
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
	ajv: null,
	children: null,
	className: '',
	component: 'form',
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
