import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import FormContext from '../Form/Context';
import Field from './Field';

vi.mock('../Form/Context');

it('should match snapshot', () => {
	const { container } = render(<Field name="username" />);
	expect(container.firstChild).toMatchSnapshot();
});

it('should call form.touch when blurred', () => {
	const context = {
		getFieldErrors: vi.fn(() => []),
		handleFieldChange: vi.fn(),
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(),
		touch: vi.fn(),
	};

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<Field name="username" />);
	fireEvent.blur(container.querySelector('input'));
	expect(context.touch).toHaveBeenCalled();
});

it('should call onBlur handler when blurred', () => {
	const onBlur = vi.fn();
	const { container } = render(<Field name="username" onBlur={onBlur} />);
	fireEvent.blur(container.querySelector('input'));
	expect(onBlur).toHaveBeenCalled();
});

it('should add class isSubmitted if form is submitted', () => {
	const context = {
		getFieldErrorDescribedBy: vi.fn(),
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(),
	};

	let { container } = render(<Field name="username" />);
	expect(container.querySelector('.Jfv_Field').classList.contains('isSubmitted')).toBe(false);

	context.isSubmitted = true;
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	({ container } = render(<Field name="username" />));
	expect(container.querySelector('.Jfv_Field').classList.contains('isSubmitted')).toBe(true);
});

it('should add class isTouched if field is touched', () => {
	const context = {
		getFieldErrorDescribedBy: vi.fn(),
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(),
	};

	let { container } = render(<Field name="username" />);
	expect(container.querySelector('.Jfv_Field').classList.contains('isTouched')).toBe(false);

	context.isFieldTouched.mockImplementation(() => true);
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	({ container } = render(<Field name="username" />));
	expect(container.querySelector('.Jfv_Field').classList.contains('isTouched')).toBe(true);
});

it('should add class isInvalid if field is invalid', () => {
	const context = {
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(),
	};

	let { container } = render(<Field name="username" />);
	expect(container.querySelector('.Jfv_Field').classList.contains('isInvalid')).toBe(false);

	context.isFieldInvalid.mockImplementation(() => true);
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	({ container } = render(<Field name="username" />));
	expect(container.querySelector('.Jfv_Field').classList.contains('isInvalid')).toBe(true);
});

it('should not expose aria-invalid nor aria-describedby while untouched and unsubmitted, even if invalid', () => {
	const context = {
		getFieldErrorDescribedBy: vi.fn(() => 'jfv1-error-username'),
		isFieldInvalid: vi.fn(() => true),
		isFieldTouched: vi.fn(() => false),
	};

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<Field name="username" />);
	// A React `aria-invalid={undefined}` prop renders no attribute at all.
	const input = container.querySelector('input');
	expect(input.hasAttribute('aria-invalid')).toBe(false);
	expect(input.hasAttribute('aria-describedby')).toBe(false);
	expect(context.getFieldErrorDescribedBy).not.toHaveBeenCalled();
});

it('should set aria-invalid when the field is invalid and touched', () => {
	const context = {
		getFieldErrorDescribedBy: vi.fn(),
		isFieldInvalid: vi.fn(() => true),
		isFieldTouched: vi.fn(() => true),
	};

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<Field name="username" />);
	// The React prop `aria-invalid={true}` renders as the string "true".
	expect(container.querySelector('input').getAttribute('aria-invalid')).toBe('true');
});

it('should set aria-invalid and aria-describedby when the field is invalid and the form submitted', () => {
	const context = {
		getFieldErrorDescribedBy: vi.fn(() => 'jfv1-error-username'),
		isFieldInvalid: vi.fn(() => true),
		isFieldTouched: vi.fn(() => false),
		isSubmitted: true,
	};

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<Field name="username" />);
	const input = container.querySelector('input');
	expect(input.getAttribute('aria-invalid')).toBe('true');
	expect(input.getAttribute('aria-describedby')).toBe('jfv1-error-username');
	expect(context.getFieldErrorDescribedBy).toHaveBeenCalledWith('username');
});

it('should not render aria-invalid when the field is valid, even touched', () => {
	const context = {
		getFieldErrorDescribedBy: vi.fn(),
		isFieldInvalid: vi.fn(() => false),
		isFieldTouched: vi.fn(() => true),
	};

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<Field name="username" />);
	expect(container.querySelector('input').hasAttribute('aria-invalid')).toBe(false);
});

it('should allow to override aria-invalid via props', () => {
	const context = {
		getFieldErrorDescribedBy: vi.fn(),
		isFieldInvalid: vi.fn(() => true),
		isFieldTouched: vi.fn(() => true),
	};

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<Field aria-invalid={false} name="username" />);
	// The React prop `aria-invalid={false}` renders as the string "false".
	expect(container.querySelector('input').getAttribute('aria-invalid')).toBe('false');
});

it('should point aria-describedby at the ids registered by the FieldErrors once touched', () => {
	const context = {
		getFieldErrorDescribedBy: vi.fn(() => 'jfv1-error-username'),
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(() => true),
	};

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<Field name="username" />);
	expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('jfv1-error-username');
	expect(context.getFieldErrorDescribedBy).toHaveBeenCalledWith('username');
});

it('should merge a user aria-describedby with the registered error ids when revealed', () => {
	const context = {
		getFieldErrorDescribedBy: vi.fn(() => 'jfv1-error-username'),
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(() => true),
	};

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<Field aria-describedby="my-hint" name="username" />);
	expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('my-hint jfv1-error-username');
});

it('should keep only the user aria-describedby while not revealed', () => {
	const context = {
		getFieldErrorDescribedBy: vi.fn(() => 'jfv1-error-username'),
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(() => false),
	};

	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	const { container } = render(<Field aria-describedby="my-hint" name="username" />);
	expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('my-hint');
	expect(context.getFieldErrorDescribedBy).not.toHaveBeenCalled();
});

it('Default component input can be changed', () => {
	const Component = () => 'component';
	const { container } = render(<Field component={Component} name="username" />);
	expect(container.textContent).toBe('component');
});

it('should call form.handleFieldChange() when field value changes', () => {
	// React 16 pools synthetic events (they are nullified after dispatch), so
	// the `target` fields are captured at call time instead of being read
	// from the mock's recorded arguments afterwards.
	let receivedTarget;
	const context = {
		handleFieldChange: vi.fn((event) => {
			receivedTarget = { name: event.target.name, value: event.target.value };
		}),
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(),
	};
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));

	const { container } = render(<Field type="text" name="username" />);
	fireEvent.change(container.querySelector('input'), { target: { value: 'newvalue' } });
	expect(context.handleFieldChange).toHaveBeenCalledTimes(1);
	expect(receivedTarget).toEqual({
		name: 'username',
		value: 'newvalue',
	});
});

it('should call onChange handler passed as prop when field value changes', () => {
	const context = {
		handleFieldChange: vi.fn(),
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(),
	};
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));
	// Pooled synthetic event (React 16): capture the target fields and the
	// second argument at call time (see previous test).
	let receivedTarget;
	let receivedFormHandler;
	const handleChange = vi.fn((event, formHandleFieldChange) => {
		receivedTarget = { name: event.target.name, value: event.target.value };
		receivedFormHandler = formHandleFieldChange;
	});
	const { container } = render(<Field type="text" onChange={handleChange} name="username" />);
	fireEvent.change(container.querySelector('input'), { target: { value: 'newvalue' } });
	expect(handleChange).toHaveBeenCalledTimes(1);
	expect(receivedTarget).toEqual({
		name: 'username',
		value: 'newvalue',
	});
	expect(receivedFormHandler).toBe(context.handleFieldChange);
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
		handleFieldChange: vi.fn(),
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(),
	};
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));

	const { container } = render(<Field name="phone" component={RawEmitter} />);
	fireEvent.click(container.querySelector('button'));

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
		handleFieldChange: vi.fn(),
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(),
	};
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));

	const { container } = render(<Field name="category" component={OptionEmitter} />);
	fireEvent.click(container.querySelector('button'));

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
		handleFieldChange: vi.fn(),
		isFieldInvalid: vi.fn(),
		isFieldTouched: vi.fn(),
	};
	FormContext.Consumer.mockImplementationOnce((props) => props.children(context));

	const handler = vi.fn();
	const { container } = render(<Field name="phone" component={RawEmitter} onChange={handler} />);
	fireEvent.click(container.querySelector('button'));

	expect(handler).toHaveBeenCalledWith('+1234567890', context.handleFieldChange);
	expect(context.handleFieldChange).not.toHaveBeenCalled();
});
