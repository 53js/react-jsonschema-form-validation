/**
 * ARIA wiring between <Field> and <FieldError> through the form-scoped
 * registry (#65), on the v1 hooks core.
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';

import { getFieldErrorId } from './a11y';
import {
	Field, FieldError, Form, useFormContext,
} from './core';
import { ajvSchema } from './providers/ajv';

const schema = ajvSchema({
	type: 'object',
	properties: {
		username: { type: 'string', minLength: 3 },
		user: { type: 'object', properties: { email: { type: 'string', minLength: 3 } } },
	},
});
const invalid = { username: 'ab', user: { email: 'ab' } };

const Capture = ({ onForm }) => { onForm(useFormContext()); return null; };

describe('getFieldErrorId(formId, name)', () => {
	it('should derive a deterministic id from the form id and the field name', () => {
		expect(getFieldErrorId('f', 'username')).toBe('f-error-username');
		expect(getFieldErrorId('f', 'user.emails[0]')).toBe('f-error-user.emails[0]');
	});
});

describe('aria-describedby wiring', () => {
	it('should wire Field aria-describedby to the id rendered by FieldError once touched', () => {
		const { container } = render(
			<Form id="f" data={invalid} onSubmit={() => {}} schema={schema}>
				<Field name="username" />
				<FieldError name="username" />
			</Form>,
		);
		const input = container.querySelector('input');
		expect(input.getAttribute('aria-describedby')).toBeNull();
		fireEvent.blur(input);
		expect(input.getAttribute('aria-describedby')).toBe('f-error-username');
		expect(container.querySelector('#f-error-username')).not.toBeNull();
	});

	it('should follow a custom FieldError id automatically', () => {
		const { container } = render(
			<Form id="f" data={invalid} onSubmit={() => {}} schema={schema}>
				<Field name="username" />
				<FieldError name="username" id="my-error" />
			</Form>,
		);
		fireEvent.blur(container.querySelector('input'));
		expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('my-error');
	});

	it('should keep the error ids of two forms sharing a field name distinct', () => {
		const { container } = render(
			<>
				<Form data={invalid} onSubmit={() => {}} schema={schema}>
					<Field name="username" />
					<FieldError name="username" />
				</Form>
				<Form data={invalid} onSubmit={() => {}} schema={schema}>
					<Field name="username" />
					<FieldError name="username" />
				</Form>
			</>,
		);
		const [i1, i2] = container.querySelectorAll('input');
		fireEvent.blur(i1);
		fireEvent.blur(i2);
		const ids = [i1, i2].map((i) => i.getAttribute('aria-describedby'));
		expect(ids[0]).not.toBe(ids[1]);
		expect(container.querySelectorAll('.Jfv_FieldError')).toHaveLength(2);
		expect(container.querySelector(`[id="${ids[0]}"]`)).not.toBeNull();
	});

	it('should list every FieldError id of the field in mount order (IDREF list)', () => {
		const { container } = render(
			<Form id="f" data={invalid} onSubmit={() => {}} schema={schema}>
				<Field name="username" />
				<FieldError name="username" id="first" />
				<FieldError name="username" id="second" />
			</Form>,
		);
		fireEvent.blur(container.querySelector('input'));
		expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('first second');
	});

	it('should drop the id of an unmounted FieldError from aria-describedby', () => {
		const Harness = ({ two }) => (
			<Form id="f" data={invalid} onSubmit={() => {}} schema={schema}>
				<Field name="username" />
				<FieldError name="username" id="first" />
				{two && <FieldError name="username" id="second" />}
			</Form>
		);
		const { container, rerender } = render(<Harness two />);
		fireEvent.blur(container.querySelector('input'));
		expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('first second');
		rerender(<Harness two={false} />);
		expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('first');
	});

	it('should merge a user aria-describedby before the registered error ids', () => {
		const { container } = render(
			<Form id="f" data={invalid} onSubmit={() => {}} schema={schema}>
				<Field name="username" aria-describedby="hint" />
				<FieldError name="username" />
			</Form>,
		);
		expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('hint');
		fireEvent.blur(container.querySelector('input'));
		expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('hint f-error-username');
	});

	it('should reference a wildcard FieldError id from the fields it covers', () => {
		const { container } = render(
			<Form id="f" data={invalid} onSubmit={() => {}} schema={schema}>
				<Field name="user.email" />
				<Field name="username" />
				<FieldError name="user.*" />
			</Form>,
		);
		const [email, username] = container.querySelectorAll('input');
		fireEvent.blur(email);
		fireEvent.blur(username);
		expect(email.getAttribute('aria-describedby')).toBe('f-error-user.*');
		expect(username.getAttribute('aria-describedby')).toBeNull();
	});

	it('should keep the registry consistent across a React 18 StrictMode double mount', () => {
		let form;
		const { container } = render(
			<React.StrictMode>
				<Form id="f" data={invalid} onSubmit={() => {}} schema={schema}>
					<Capture onForm={(f) => { form = f; }} />
					<Field name="username" />
					<FieldError name="username" />
				</Form>
			</React.StrictMode>,
		);
		expect(form.getState().fieldErrorRegistry).toHaveLength(1);
		fireEvent.blur(container.querySelector('input'));
		expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('f-error-username');
	});

	it('should unmount a whole form silently and leave the api usable', () => {
		let form;
		const { unmount } = render(
			<Form id="f" data={invalid} onSubmit={() => {}} schema={schema}>
				<Capture onForm={(f) => { form = f; }} />
				<Field name="username" />
				<FieldError name="username" />
				<FieldError name="user.email" />
			</Form>,
		);
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => unmount()).not.toThrow();
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
		expect(form.getState().fieldErrorRegistry).toEqual([]);
		expect(() => act(() => form.touch('username'))).not.toThrow();
	});
});
