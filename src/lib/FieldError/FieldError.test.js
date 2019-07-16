import React from 'react';
import { mount } from 'enzyme';

import FormContext from '../Form/Context';
import FieldError from './FieldError';

jest.mock('../Form/Context');

it('should match snapshot', () => {
	const context = {
		getFieldErrors: jest.fn(() => [{ keyword: 'bad' }]),
		isFieldTouched: jest.fn(),
	};

	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	const fieldError = mount(<FieldError name="username" />);
	expect(fieldError).toMatchSnapshot();
});

it('should not be displayed if field has no error', () => {
	const fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find(FormContext.Consumer).exists()).toBe(true);
});

it('should call error message of first error only if field has errors', () => {
	const context = {
		errorMessages: {
			bad1: jest.fn(),
			bad2: jest.fn(),
		},
		getFieldErrors: jest.fn(() => [{ keyword: 'bad1' }, { keyword: 'bad2' }]),
		isFieldTouched: jest.fn(),
	};

	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	mount(<FieldError name="username" />);
	expect(context.errorMessages.bad1).toHaveBeenCalled();
	expect(context.errorMessages.bad2).not.toHaveBeenCalled();
});

it('should allow to extend and override error messages defined in form', () => {
	const context = {
		errorMessages: {
			bad1: jest.fn(),
			bad2: jest.fn(),
		},
		getFieldErrors: jest.fn(() => [{ keyword: 'bad1' }, { keyword: 'bad2' }]),
		isFieldTouched: jest.fn(),
	};

	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	const bad1Override = jest.fn();
	mount(
		<FieldError
			errorMessages={{ bad1: bad1Override }}
			name="username"
		/>,
	);
	expect(bad1Override).toHaveBeenCalled();
	expect(context.errorMessages.bad1).not.toHaveBeenCalled();

	context.getFieldErrors = jest.fn(() => [{ keyword: 'bad3' }]);
	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	const bad3 = jest.fn();
	mount(
		<FieldError
			errorMessages={{ bad3 }}
			name="username"
		/>,
	);
	expect(bad3).toHaveBeenCalled();
	expect(context.errorMessages.bad1).not.toHaveBeenCalled();
});

it('should render children if providen', () => {
	const context = {
		getFieldErrors: jest.fn(() => [{ keyword: 'bad1' }]),
		isFieldTouched: jest.fn(),
	};
	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	const fieldError = mount(
		<FieldError name="username">
			<span id="message" />
		</FieldError>,
	);
	expect(fieldError.exists('#message')).toBe(true);
});

it('should add class isSubmitted if form is submitted', () => {
	const context = {
		getFieldErrors: jest.fn(() => [{ keyword: 'bad1' }]),
		isFieldTouched: jest.fn(),
	};
	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	let fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find('.Sjf_FieldError').hasClass('isSubmitted')).toBe(false);

	context.isSubmitted = true;
	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find('.Sjf_FieldError').hasClass('isSubmitted')).toBe(true);
});

it('should add class isTouched if field is touched', () => {
	const context = {
		getFieldErrors: jest.fn(() => [{ keyword: 'bad1' }]),
		isFieldTouched: jest.fn(),
	};
	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	let fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find('.Sjf_FieldError').hasClass('isTouched')).toBe(false);

	context.isFieldTouched.mockImplementation(() => true);
	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find('.Sjf_FieldError').hasClass('isTouched')).toBe(true);
});
