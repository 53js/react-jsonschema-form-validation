/**
 * Integration tests of the Field / FieldError ARIA wiring through a real
 * <Form> (no context mock): id registry, formId prefixes, IDREF lists.
 *
 * The formId module counter increments at each <Form> instance, so these
 * tests read the id actually rendered by <FieldError> and assert that
 * <Field> points at it, instead of hardcoding `jfv1` everywhere.
 */
import React from 'react';
import { mount } from 'enzyme';

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
	const wrapper = mount(
		<Form {...formProps}>
			<Field name="username" />
			<FieldError name="username" />
		</Form>,
	);

	wrapper.find('input').simulate('blur');
	wrapper.update();

	const errorId = wrapper.find('div.Jfv_FieldError').prop('id');
	expect(errorId).toMatch(/^jfv\d+-error-username$/);
	expect(wrapper.find('input').prop('aria-describedby')).toBe(errorId);
	expect(wrapper.find('input').prop('aria-invalid')).toBe(true);
});

it('should follow a custom FieldError id automatically', () => {
	const wrapper = mount(
		<Form {...formProps}>
			<Field name="username" />
			<FieldError id="my-custom-error" name="username" />
		</Form>,
	);

	wrapper.find('input').simulate('blur');
	wrapper.update();

	expect(wrapper.find('div.Jfv_FieldError').prop('id')).toBe('my-custom-error');
	expect(wrapper.find('input').prop('aria-describedby')).toBe('my-custom-error');
});

it('should keep the error ids of two forms sharing a field name distinct', () => {
	const wrapper = mount(
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

	wrapper.find('input').at(0).simulate('blur');
	wrapper.find('input').at(1).simulate('blur');
	wrapper.update();

	const ids = wrapper.find('div.Jfv_FieldError').map((node) => node.prop('id'));
	expect(ids).toHaveLength(2);
	expect(ids[0]).not.toBe(ids[1]);
	expect(wrapper.find('input').at(0).prop('aria-describedby')).toBe(ids[0]);
	expect(wrapper.find('input').at(1).prop('aria-describedby')).toBe(ids[1]);
});

it('should list every FieldError id of the field in mount order (IDREF list)', () => {
	const wrapper = mount(
		<Form {...formProps}>
			<Field name="username" />
			<FieldError name="username" />
			<FieldError id="second-error" name="username" />
		</Form>,
	);

	wrapper.find('input').simulate('blur');
	wrapper.update();

	const firstId = wrapper.find('div.Jfv_FieldError').at(0).prop('id');
	expect(wrapper.find('input').prop('aria-describedby')).toBe(`${firstId} second-error`);
});

it('should drop the id of an unmounted FieldError from aria-describedby', () => {
	const children = [
		<Field key="field" name="username" />,
		<FieldError key="first" name="username" />,
		<FieldError id="second-error" key="second" name="username" />,
	];
	const wrapper = mount(<Form {...formProps}>{children}</Form>);

	wrapper.find('input').simulate('blur');
	wrapper.update();

	const firstId = wrapper.find('div.Jfv_FieldError').at(0).prop('id');
	expect(wrapper.find('input').prop('aria-describedby')).toBe(`${firstId} second-error`);

	wrapper.setProps({ children: children.slice(0, 2) });
	wrapper.update();
	expect(wrapper.find('input').prop('aria-describedby')).toBe(firstId);
});

it('should merge a user aria-describedby before the registered error ids', () => {
	const wrapper = mount(
		<Form {...formProps}>
			<Field aria-describedby="username-hint" name="username" />
			<FieldError name="username" />
		</Form>,
	);

	expect(wrapper.find('input').prop('aria-describedby')).toBe('username-hint');

	wrapper.find('input').simulate('blur');
	wrapper.update();

	const errorId = wrapper.find('div.Jfv_FieldError').prop('id');
	expect(wrapper.find('input').prop('aria-describedby')).toBe(`username-hint ${errorId}`);
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
	const wrapper = mount(
		<Form data={{ user: {} }} onSubmit={() => {}} schema={nestedSchema}>
			<Field name="user.email" />
			<FieldError name="user.*" />
		</Form>,
	);

	wrapper.find('input').simulate('blur');
	wrapper.update();

	const errorId = wrapper.find('div.Jfv_FieldError').prop('id');
	expect(errorId).toMatch(/^jfv\d+-error-user\.\*$/);
	expect(wrapper.find('input').prop('aria-describedby')).toBe(errorId);
});

it('should reset the unmounting flag on remount (React 18 StrictMode)', () => {
	const wrapper = mount(
		<Form {...formProps}>
			<FieldError name="username" />
		</Form>,
	);
	const instance = wrapper.instance();
	expect(instance.fieldErrorRegistry.size).toBe(1);
	const key = [...instance.fieldErrorRegistry.keys()][0];

	// React 18 StrictMode (dev) unmounts then REMOUNTS the same instance:
	// componentWillUnmount followed by componentDidMount. Unregistering
	// must work again after the remount.
	instance.componentWillUnmount();
	instance.componentDidMount();

	instance.unregisterFieldError(key);
	expect(instance.fieldErrorRegistry.size).toBe(0);

	wrapper.unmount();
});

it('should make unregisterFieldError a no-op while the form unmounts', () => {
	const wrapper = mount(
		<Form {...formProps}>
			<FieldError name="username" />
		</Form>,
	);
	const instance = wrapper.instance();
	expect(instance.fieldErrorRegistry.size).toBe(1);
	const key = [...instance.fieldErrorRegistry.keys()][0];

	// Simulate the unmount sequence: the Form's willUnmount runs first and
	// raises the flag, then the child FieldError unregisters.
	instance.componentWillUnmount();
	const setStateSpy = jest.spyOn(instance, 'setState');
	instance.unregisterFieldError(key);

	expect(setStateSpy).not.toHaveBeenCalled();
	expect(instance.fieldErrorRegistry.size).toBe(1);

	setStateSpy.mockRestore();
	wrapper.unmount();
});

it('should unmount a whole form silently (unregister no-op while unmounting)', () => {
	const wrapper = mount(
		<Form {...formProps}>
			<Field name="username" />
			<FieldError name="username" />
		</Form>,
	);

	// Without the `unmounting` flag, the unregister fired by the child
	// FieldError would setState on the Form being destroyed, and React
	// would report it through console.error.
	const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
	try {
		expect(() => wrapper.unmount()).not.toThrow();
		expect(errorSpy).not.toHaveBeenCalled();
	} finally {
		errorSpy.mockRestore();
	}
});
