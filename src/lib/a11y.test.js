/**
 * Integration tests of the Field / FieldError ARIA wiring through a real
 * <Form> (no context mock): id registry, formId prefixes, IDREF lists.
 *
 * The formId module counter increments at each <Form> instance, so these
 * tests read the id actually rendered by <FieldError> and assert that
 * <Field> points at it, instead of hardcoding `jfv1` everywhere.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import Form from './Form';
import Field from './Field';
import FieldError from './FieldError';

const schema = {
	type: 'object',
	properties: {
		username: { type: 'string' },
	},
	required: ['username'],
};

const formProps = {
	data: {},
	onSubmit: () => {},
	schema,
};

it('should wire Field aria-describedby to the id rendered by FieldError once touched', () => {
	const { container } = render(
		<Form {...formProps}>
			<Field name="username" />
			<FieldError name="username" />
		</Form>,
	);

	const input = container.querySelector('input');
	fireEvent.blur(input);

	const errorId = container.querySelector('div.Jfv_FieldError').getAttribute('id');
	expect(errorId).toMatch(/^jfv\d+-error-username$/);
	expect(input.getAttribute('aria-describedby')).toBe(errorId);
	expect(input.getAttribute('aria-invalid')).toBe('true');
});

it('should follow a custom FieldError id automatically', () => {
	const { container } = render(
		<Form {...formProps}>
			<Field name="username" />
			<FieldError id="my-custom-error" name="username" />
		</Form>,
	);

	const input = container.querySelector('input');
	fireEvent.blur(input);

	expect(container.querySelector('div.Jfv_FieldError').getAttribute('id')).toBe('my-custom-error');
	expect(input.getAttribute('aria-describedby')).toBe('my-custom-error');
});

it('should keep the error ids of two forms sharing a field name distinct', () => {
	const { container } = render(
		<div>
			<Form {...formProps}>
				<Field name="username" />
				<FieldError name="username" />
			</Form>
			<Form {...formProps}>
				<Field name="username" />
				<FieldError name="username" />
			</Form>
		</div>,
	);

	const inputs = container.querySelectorAll('input');
	fireEvent.blur(inputs[0]);
	fireEvent.blur(inputs[1]);

	const ids = [...container.querySelectorAll('div.Jfv_FieldError')]
		.map((node) => node.getAttribute('id'));
	expect(ids).toHaveLength(2);
	expect(ids[0]).not.toBe(ids[1]);
	expect(inputs[0].getAttribute('aria-describedby')).toBe(ids[0]);
	expect(inputs[1].getAttribute('aria-describedby')).toBe(ids[1]);
});

it('should list every FieldError id of the field in mount order (IDREF list)', () => {
	const { container } = render(
		<Form {...formProps}>
			<Field name="username" />
			<FieldError name="username" />
			<FieldError id="second-error" name="username" />
		</Form>,
	);

	const input = container.querySelector('input');
	fireEvent.blur(input);

	const firstId = container.querySelectorAll('div.Jfv_FieldError')[0].getAttribute('id');
	expect(input.getAttribute('aria-describedby')).toBe(`${firstId} second-error`);
});

it('should drop the id of an unmounted FieldError from aria-describedby', () => {
	const children = [
		<Field key="field" name="username" />,
		<FieldError key="first" name="username" />,
		<FieldError id="second-error" key="second" name="username" />,
	];
	const { container, rerender } = render(<Form {...formProps}>{children}</Form>);

	const input = container.querySelector('input');
	fireEvent.blur(input);

	const firstId = container.querySelectorAll('div.Jfv_FieldError')[0].getAttribute('id');
	expect(input.getAttribute('aria-describedby')).toBe(`${firstId} second-error`);

	rerender(<Form {...formProps}>{children.slice(0, 2)}</Form>);
	expect(input.getAttribute('aria-describedby')).toBe(firstId);
});

it('should merge a user aria-describedby before the registered error ids', () => {
	const { container } = render(
		<Form {...formProps}>
			<Field aria-describedby="username-hint" name="username" />
			<FieldError name="username" />
		</Form>,
	);

	const input = container.querySelector('input');
	expect(input.getAttribute('aria-describedby')).toBe('username-hint');

	fireEvent.blur(input);

	const errorId = container.querySelector('div.Jfv_FieldError').getAttribute('id');
	expect(input.getAttribute('aria-describedby')).toBe(`username-hint ${errorId}`);
});

it('should reference a wildcard FieldError id from the fields it covers', () => {
	const nestedSchema = {
		type: 'object',
		properties: {
			user: {
				type: 'object',
				properties: {
					email: { type: 'string' },
				},
				required: ['email'],
			},
		},
		required: ['user'],
	};
	const { container } = render(
		<Form data={{ user: {} }} onSubmit={() => {}} schema={nestedSchema}>
			<Field name="user.email" />
			<FieldError name="user.*" />
		</Form>,
	);

	const input = container.querySelector('input');
	fireEvent.blur(input);

	const errorId = container.querySelector('div.Jfv_FieldError').getAttribute('id');
	expect(errorId).toMatch(/^jfv\d+-error-user\.\*$/);
	expect(input.getAttribute('aria-describedby')).toBe(errorId);
});

it('should reset the unmounting flag on remount (React 18 StrictMode)', () => {
	const ref = React.createRef();
	const { unmount } = render(
		<Form {...formProps} ref={ref}>
			<FieldError name="username" />
		</Form>,
	);
	const instance = ref.current;
	expect(instance.fieldErrorRegistry.size).toBe(1);
	const key = [...instance.fieldErrorRegistry.keys()][0];

	// React 18 StrictMode (dev) unmounts then REMOUNTS the same instance:
	// componentWillUnmount followed by componentDidMount. Unregistering
	// must work again after the remount.
	instance.componentWillUnmount();
	instance.componentDidMount();

	instance.unregisterFieldError(key);
	expect(instance.fieldErrorRegistry.size).toBe(0);

	unmount();
});

it('should make unregisterFieldError a no-op while the form unmounts', () => {
	const ref = React.createRef();
	const { unmount } = render(
		<Form {...formProps} ref={ref}>
			<FieldError name="username" />
		</Form>,
	);
	const instance = ref.current;
	expect(instance.fieldErrorRegistry.size).toBe(1);
	const key = [...instance.fieldErrorRegistry.keys()][0];

	// Simulate the unmount sequence: the Form's willUnmount runs first and
	// raises the flag, then the child FieldError unregisters.
	instance.componentWillUnmount();
	const setStateSpy = vi.spyOn(instance, 'setState');
	instance.unregisterFieldError(key);

	expect(setStateSpy).not.toHaveBeenCalled();
	expect(instance.fieldErrorRegistry.size).toBe(1);

	setStateSpy.mockRestore();
	unmount();
});

it('should unmount a whole form silently (unregister no-op while unmounting)', () => {
	const { unmount } = render(
		<Form {...formProps}>
			<Field name="username" />
			<FieldError name="username" />
		</Form>,
	);

	// Without the `unmounting` flag, the unregister fired by the child
	// FieldError would setState on the Form being destroyed, and React
	// would report it through console.error.
	const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	try {
		expect(() => unmount()).not.toThrow();
		expect(errorSpy).not.toHaveBeenCalled();
	} finally {
		errorSpy.mockRestore();
	}
});
