import React from 'react';
import { render } from '@testing-library/react';

import FormContext from '../Form/Context';
import FieldError from './FieldError';

vi.mock('../Form/Context');

// Minimal form context: the id registration lifecycles need `formId`,
// `registerFieldError` and `unregisterFieldError` on every mount.
const createContext = (overrides) => ({
	formId: 'jfv1',
	getFieldErrors: vi.fn(() => [{ keyword: 'bad1' }]),
	isFieldTouched: vi.fn(),
	registerFieldError: vi.fn(),
	unregisterFieldError: vi.fn(),
	...overrides,
});

it('should match snapshot', () => {
	const context = createContext({
		getFieldErrors: vi.fn(() => [{ keyword: 'bad' }]),
	});

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<FieldError name="username" />);
	expect(container.querySelector('div.Jfv_FieldError')).toMatchSnapshot();
});

it('should not be displayed if field has no error', () => {
	// The default mocked context returns no error: the consumer renders,
	// but no error element reaches the DOM.
	const { container } = render(<FieldError name="username" />);
	expect(FormContext.Consumer).toHaveBeenCalled();
	expect(container.firstChild).toBeNull();
});

it('should call error message of first error only if field has errors', () => {
	const context = createContext({
		errorMessages: {
			bad1: vi.fn(),
			bad2: vi.fn(),
		},
		getFieldErrors: vi.fn(() => [{ keyword: 'bad1' }, { keyword: 'bad2' }]),
	});

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	render(<FieldError name="username" />);
	expect(context.errorMessages.bad1).toHaveBeenCalled();
	expect(context.errorMessages.bad2).not.toHaveBeenCalled();
});

it('should allow to extend and override error messages defined in form', () => {
	const context = createContext({
		errorMessages: {
			bad1: vi.fn(),
			bad2: vi.fn(),
		},
		getFieldErrors: vi.fn(() => [{ keyword: 'bad1' }, { keyword: 'bad2' }]),
	});

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const bad1Override = vi.fn();
	render(
		<FieldError
			errorMessages={{ bad1: bad1Override }}
			name="username"
		/>,
	);
	expect(bad1Override).toHaveBeenCalled();
	expect(context.errorMessages.bad1).not.toHaveBeenCalled();

	context.getFieldErrors = vi.fn(() => [{ keyword: 'bad3' }]);
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const bad3 = vi.fn();
	render(
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
	const { container } = render(
		<FieldError name="username">
			<span id="message" />
		</FieldError>,
	);
	expect(container.querySelector('#message')).not.toBeNull();
});

it('should add class isSubmitted if form is submitted', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	let { container } = render(<FieldError name="username" />);
	expect(container.querySelector('.Jfv_FieldError').classList.contains('isSubmitted')).toBe(false);

	context.isSubmitted = true;
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	({ container } = render(<FieldError name="username" />));
	expect(container.querySelector('.Jfv_FieldError').classList.contains('isSubmitted')).toBe(true);
});

it('should have role="alert" by default so errors are announced to screen readers', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<FieldError name="username" />);
	expect(container.querySelector('.Jfv_FieldError').getAttribute('role')).toBe('alert');
});

it('should allow to override role via props', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<FieldError name="username" role="status" />);
	expect(container.querySelector('.Jfv_FieldError').getAttribute('role')).toBe('status');
});

it('should render a deterministic id prefixed by the formId', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<FieldError name="username" />);
	expect(container.querySelector('.Jfv_FieldError').getAttribute('id')).toBe('jfv1-error-username');
});

it('should allow to override id via props', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<FieldError id="custom-id" name="username" />);
	expect(container.querySelector('.Jfv_FieldError').getAttribute('id')).toBe('custom-id');
});

it('should register its default id in the form on mount', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	render(<FieldError name="username" />);
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
	render(<FieldError id="custom-id" name="username" />);
	expect(context.registerFieldError).toHaveBeenCalledWith(
		expect.any(String),
		'username',
		'custom-id',
	);
});

it('should unregister its key from the form on unmount', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { unmount } = render(<FieldError name="username" />);
	const key = context.registerFieldError.mock.calls[0][0];

	unmount();
	expect(context.unregisterFieldError).toHaveBeenCalledTimes(1);
	expect(context.unregisterFieldError).toHaveBeenCalledWith(key);
});

it('should not re-register on updates that leave (name, id) unchanged', () => {
	const context = createContext();
	FormContext.Consumer
		.mockImplementationOnce((props) => props.children(context))
		.mockImplementationOnce((props) => props.children(context));
	const { rerender } = render(<FieldError name="username" />);

	rerender(<FieldError className="other" name="username" />);
	expect(context.registerFieldError).toHaveBeenCalledTimes(1);
});

it('should re-register under the same key when its id changes', () => {
	const context = createContext();
	FormContext.Consumer
		.mockImplementationOnce((props) => props.children(context))
		.mockImplementationOnce((props) => props.children(context));
	const { rerender } = render(<FieldError name="username" />);
	const key = context.registerFieldError.mock.calls[0][0];

	rerender(<FieldError id="new-id" name="username" />);
	expect(context.registerFieldError).toHaveBeenCalledTimes(2);
	expect(context.registerFieldError).toHaveBeenLastCalledWith(key, 'username', 'new-id');
});

it('should add class isTouched if field is touched', () => {
	const context = createContext();
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	let { container } = render(<FieldError name="username" />);
	expect(container.querySelector('.Jfv_FieldError').classList.contains('isTouched')).toBe(false);

	context.isFieldTouched.mockImplementation(() => true);
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	({ container } = render(<FieldError name="username" />));
	expect(container.querySelector('.Jfv_FieldError').classList.contains('isTouched')).toBe(true);
});
