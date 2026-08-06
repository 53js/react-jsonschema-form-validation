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

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
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
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
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
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
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
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	field = mount(<Field name="username" />);
	expect(field.find('.Jfv_Field').hasClass('isInvalid')).toBe(true);
});

it('should set aria-invalid when the field is invalid', () => {
	const context = {
		isFieldInvalid: jest.fn(() => true),
		isFieldTouched: jest.fn(),
	};

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const field = mount(<Field name="username" />);
	expect(field.find('input').prop('aria-invalid')).toBe(true);
	expect(field.find('input').getDOMNode().getAttribute('aria-invalid')).toBe('true');
});

it('should not render aria-invalid when the field is valid', () => {
	const field = mount(<Field name="username" />);
	expect(field.find('input').prop('aria-invalid')).toBe(undefined);
	expect(field.find('input').getDOMNode().hasAttribute('aria-invalid')).toBe(false);
});

it('should allow to override aria-invalid via props', () => {
	const context = {
		isFieldInvalid: jest.fn(() => true),
		isFieldTouched: jest.fn(),
	};

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const field = mount(<Field aria-invalid={false} name="username" />);
	expect(field.find('input').prop('aria-invalid')).toBe(false);
});

it('should point aria-describedby at the matching FieldError id by default', () => {
	const field = mount(<Field name="username" />);
	expect(field.find('input').prop('aria-describedby')).toBe('jfv-error-username');
});

it('should allow to override aria-describedby via props', () => {
	const field = mount(<Field aria-describedby="my-hint" name="username" />);
	expect(field.find('input').prop('aria-describedby')).toBe('my-hint');
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
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));

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
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
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

// Regression: children that emit a raw value instead of a DOM event
// (e.g. react-phone-number-input's `onChange('+1234567890')`) used to
// pollute `data` with a bogus key when no user handler was supplied —
// Form.handleFieldChange treats a string first arg as the field name.
// The wrapper must now synthesize an event using the Field's `name`.
it('should wrap a raw string emitted by a non-DOM child into a synthetic event (no user handler)', () => {
	// eslint-disable-next-line react/prop-types
	const RawEmitter = ({ onChange }) => (
		<button type="button" onClick={() => onChange('+1234567890')}>
			emit
		</button>
	);
	const context = {
		handleFieldChange: jest.fn(),
		isFieldInvalid: jest.fn(),
		isFieldTouched: jest.fn(),
	};
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));

	const field = mount(<Field name="phone" component={RawEmitter} />);
	field.find('button').simulate('click');

	expect(context.handleFieldChange).toHaveBeenCalledWith({
		target: { name: 'phone', value: '+1234567890' },
	});
});

it('should wrap a raw object emitted by a non-DOM child into a synthetic event (no user handler)', () => {
	// Simulates a react-select-style component that calls
	// `onChange({ value, label })`.
	// eslint-disable-next-line react/prop-types
	const OptionEmitter = ({ onChange }) => (
		<button type="button" onClick={() => onChange({ value: 'foo', label: 'Foo' })}>
			emit
		</button>
	);
	const context = {
		handleFieldChange: jest.fn(),
		isFieldInvalid: jest.fn(),
		isFieldTouched: jest.fn(),
	};
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));

	const field = mount(<Field name="category" component={OptionEmitter} />);
	field.find('button').simulate('click');

	expect(context.handleFieldChange).toHaveBeenCalledWith({
		target: { name: 'category', value: { value: 'foo', label: 'Foo' } },
	});
});

it('should pass a raw value straight through to a user-supplied onChange without wrapping', () => {
	// Preserves the 0.6.0 behavior for handler-based flows: the user gets
	// the raw emission (string / object / whatever the child emitted).
	// eslint-disable-next-line react/prop-types
	const RawEmitter = ({ onChange }) => (
		<button type="button" onClick={() => onChange('+1234567890')}>
			emit
		</button>
	);
	const context = {
		handleFieldChange: jest.fn(),
		isFieldInvalid: jest.fn(),
		isFieldTouched: jest.fn(),
	};
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));

	const handler = jest.fn();
	const field = mount(<Field name="phone" component={RawEmitter} onChange={handler} />);
	field.find('button').simulate('click');

	expect(handler).toHaveBeenCalledWith('+1234567890', context.handleFieldChange);
	expect(context.handleFieldChange).not.toHaveBeenCalled();
});
