import React from 'react';
import { mount } from 'enzyme';

import FormContext from '../Form/Context';
import FieldError from './FieldError';

jest.mock('../Form/Context');

// Minimal form context: the id registration lifecycles need `formId`,
// `registerFieldError` and `unregisterFieldError` on every mount.
const createContext = (overrides) => ({
	formId: 'jfv1',
	getFieldErrors: jest.fn(() => [{ keyword: 'bad1' }]),
	isFieldTouched: jest.fn(),
	registerFieldError: jest.fn(),
	unregisterFieldError: jest.fn(),
	...overrides,
});

it('should match snapshot', () => {
	const context = createContext({
		getFieldErrors: jest.fn(() => [{ keyword: 'bad' }]),
	});

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const fieldError = mount(<FieldError name="username" />);
	// Snapshot the rendered element only: the full wrapper would serialize
	// the mocked `form` prop (jest.fn call records) — noisy and brittle.
	expect(fieldError.find('div.Jfv_FieldError')).toMatchSnapshot();
});

it('should not be displayed if field has no error', () => {
	const fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find(FormContext.Consumer).exists()).toBe(true);
});

it('should call error message of first error only if field has errors', () => {
	const context = createContext({
		errorMessages: {
			bad1: jest.fn(),
			bad2: jest.fn(),
		},
		getFieldErrors: jest.fn(() => [{ keyword: 'bad1' }, { keyword: 'bad2' }]),
	});

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	mount(<FieldError name="username" />);
	expect(context.errorMessages.bad1).toHaveBeenCalled();
	expect(context.errorMessages.bad2).not.toHaveBeenCalled();
});

it('should allow to extend and override error messages defined in form', () => {
	const context = createContext({
		errorMessages: {
			bad1: jest.fn(),
			bad2: jest.fn(),
		},
		getFieldErrors: jest.fn(() => [{ keyword: 'bad1' }, { keyword: 'bad2' }]),
	});

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
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
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
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
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const fieldError = mount(
		<FieldError name="username">
			<span id="message" />
		</FieldError>,
	);
	expect(fieldError.exists('#message')).toBe(true);
});

it('should add class isSubmitted if form is submitted', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	let fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find('.Jfv_FieldError').hasClass('isSubmitted')).toBe(false);

	context.isSubmitted = true;
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find('.Jfv_FieldError').hasClass('isSubmitted')).toBe(true);
});

it('should have role="alert" by default so errors are announced to screen readers', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find('.Jfv_FieldError').prop('role')).toBe('alert');
});

it('should allow to override role via props', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const fieldError = mount(<FieldError name="username" role="status" />);
	expect(fieldError.find('.Jfv_FieldError').prop('role')).toBe('status');
});

it('should render a deterministic id prefixed by the formId', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find('.Jfv_FieldError').prop('id')).toBe('jfv1-error-username');
});

it('should allow to override id via props', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const fieldError = mount(<FieldError id="custom-id" name="username" />);
	expect(fieldError.find('.Jfv_FieldError').prop('id')).toBe('custom-id');
});

it('should register its default id in the form on mount', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	mount(<FieldError name="username" />);
	expect(context.registerFieldError).toHaveBeenCalledTimes(1);
	expect(context.registerFieldError).toHaveBeenCalledWith(
		expect.any(String),
		'username',
		'jfv1-error-username',
	);
});

it('should register a custom id in the form so Field aria-describedby follows it', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	mount(<FieldError id="custom-id" name="username" />);
	expect(context.registerFieldError).toHaveBeenCalledWith(
		expect.any(String),
		'username',
		'custom-id',
	);
});

it('should unregister its key from the form on unmount', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const fieldError = mount(<FieldError name="username" />);
	const key = context.registerFieldError.mock.calls[0][0];

	fieldError.unmount();
	expect(context.unregisterFieldError).toHaveBeenCalledTimes(1);
	expect(context.unregisterFieldError).toHaveBeenCalledWith(key);
});

it('should not re-register on updates that leave (name, id) unchanged', () => {
	const context = createContext();
	FormContext.Consumer
		.mockImplementationOnce((props) => props.children(context))
		.mockImplementationOnce((props) => props.children(context));
	const fieldError = mount(<FieldError name="username" />);

	fieldError.setProps({ className: 'other' });
	expect(context.registerFieldError).toHaveBeenCalledTimes(1);
});

it('should re-register under the same key when its id changes', () => {
	const context = createContext();
	FormContext.Consumer
		.mockImplementationOnce((props) => props.children(context))
		.mockImplementationOnce((props) => props.children(context));
	const fieldError = mount(<FieldError name="username" />);
	const key = context.registerFieldError.mock.calls[0][0];

	fieldError.setProps({ id: 'new-id' });
	expect(context.registerFieldError).toHaveBeenCalledTimes(2);
	expect(context.registerFieldError).toHaveBeenLastCalledWith(key, 'username', 'new-id');
});

it('should add class isTouched if field is touched', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	let fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find('.Jfv_FieldError').hasClass('isTouched')).toBe(false);

	context.isFieldTouched.mockImplementation(() => true);
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	fieldError = mount(<FieldError name="username" />);
	expect(fieldError.find('.Jfv_FieldError').hasClass('isTouched')).toBe(true);
});
