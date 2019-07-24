import React from 'react';
import { mount } from 'enzyme';

import FormContext from '../Form/Context';
import Field from './Field';

jest.mock('../Form/Context');

it('should match snapshot', () => {
	const field = mount(<Field name="username" />);
	expect(field).toMatchSnapshot();
});

it('should call form.touch when blurred', () => {
	const context = {
		getFieldErrors: jest.fn(() => []),
		handleFieldChange: jest.fn(),
		isFieldInvalid: jest.fn(),
		isFieldTouched: jest.fn(),
		touch: jest.fn(),
	};

	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	const field = mount(<Field name="username" />);
	field.find('input').simulate('blur');
	expect(context.touch).toHaveBeenCalled();
});

it('should call onBlur handler when blurred', () => {
	const onBlur = jest.fn();
	const field = mount(<Field name="username" onBlur={onBlur} />);
	field.find('input').simulate('blur');
	expect(onBlur).toHaveBeenCalled();
});

it('should add class isSubmitted if form is submitted', () => {
	const context = {
		isFieldInvalid: jest.fn(),
		isFieldTouched: jest.fn(),
	};

	let field = mount(<Field name="username" />);
	expect(field.find('.Jfv_Field').hasClass('isSubmitted')).toBe(false);

	context.isSubmitted = true;
	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	field = mount(<Field name="username" />);
	expect(field.find('.Jfv_Field').hasClass('isSubmitted')).toBe(true);
});

it('should add class isTouched if field is touched', () => {
	const context = {
		isFieldInvalid: jest.fn(),
		isFieldTouched: jest.fn(),
	};

	let field = mount(<Field name="username" />);
	expect(field.find('.Jfv_Field').hasClass('isTouched')).toBe(false);

	context.isFieldTouched.mockImplementation(() => true);
	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	field = mount(<Field name="username" />);
	expect(field.find('.Jfv_Field').hasClass('isTouched')).toBe(true);
});

it('should add class isInvalid if field is invalid', () => {
	const context = {
		isFieldInvalid: jest.fn(),
		isFieldTouched: jest.fn(),
	};

	let field = mount(<Field name="username" />);
	expect(field.find('.Jfv_Field').hasClass('isInvalid')).toBe(false);

	context.isFieldInvalid.mockImplementation(() => true);
	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	field = mount(<Field name="username" />);
	expect(field.find('.Jfv_Field').hasClass('isInvalid')).toBe(true);
});

it('Default component input can be changed', () => {
	const Component = () => 'component';
	const field = mount(<Field component={Component} name="username" />);
	expect(field.exists(Component)).toBe(true);
});

it('should call form.handleFieldChange() when field value changes', () => {
	const context = {
		handleFieldChange: jest.fn(),
		isFieldInvalid: jest.fn(),
		isFieldTouched: jest.fn(),
	};
	FormContext.Consumer.mockImplementationOnce(props => props.children(context));

	const field = mount(<Field type="text" name="username" />);
	const input = field.find('input');
	input.getDOMNode().value = 'newvalue';
	input.simulate('change');
	expect(context.handleFieldChange).toHaveBeenCalledWith(
		expect.objectContaining({
			target: expect.objectContaining({
				name: 'username',
				value: 'newvalue',
			}),
		}),
	);
});

it('should call onChange handler passed as prop when field value changes', () => {
	const context = {
		handleFieldChange: jest.fn(),
		isFieldInvalid: jest.fn(),
		isFieldTouched: jest.fn(),
	};
	FormContext.Consumer.mockImplementationOnce(props => props.children(context));
	const handleChange = jest.fn();
	const field = mount(<Field type="text" onChange={handleChange} name="username" />);
	const input = field.find('input');
	input.getDOMNode().value = 'newvalue';
	input.simulate('change');
	expect(handleChange).toHaveBeenCalledWith(
		expect.objectContaining({
			target: expect.objectContaining({
				name: 'username',
				value: 'newvalue',
			}),
		}),
		context.handleFieldChange,
	);
	expect(context.handleFieldChange).not.toHaveBeenCalled();
});
