import React, { useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';

import { ajvSchema } from '../providers/ajv';
import Form from './Form';
import Field from './Field';
import FieldError from './FieldError';
import useForm from './useForm';
import { useFormContext } from './Context';

const schema = ajvSchema({
	type: 'object',
	properties: {
		username: { type: 'string', minLength: 3, maxLength: 5 },
		age: { type: 'number', minimum: 18 },
	},
	required: ['username'],
});

const Capture = ({ onForm }) => { onForm(useFormContext()); return null; };
const renderError = (errorProps = {}, formProps = {}, extra = null) => {
	let form;
	const utils = render(
		<Form id="f" onSubmit={() => {}} schema={schema} data={{ username: 'ab' }} {...formProps}>
			<Capture onForm={(f) => { form = f; }} />
			<FieldError name="username" {...errorProps} />
			{extra}
		</Form>,
	);
	return { ...utils, form: () => form, error: () => utils.container.querySelector('.Jfv_FieldError') };
};

it('should render a div.Jfv_FieldError[role=alert] with the deterministic id and the provider message', () => {
	const { error, form } = renderError();
	expect(error().tagName).toBe('DIV');
	expect(error().className).toBe('Jfv_FieldError');
	expect(error().id).toBe('f-error-username');
	expect(error().getAttribute('role')).toBe('alert');
	expect(error().textContent).toBe(form().getFieldErrors('username')[0].raw.message);
});

describe('display', () => {
	it('should render nothing while the field has no error', () => {
		const { error } = renderError({}, { data: { username: 'hugo' } });
		expect(error()).toBeNull();
	});

	it('should display the message of the first error only', () => {
		const first = vi.fn(() => 'first');
		const second = vi.fn(() => 'second');
		// A custom Standard Schema reporting two issues on the same field.
		const custom = {
			'~standard': {
				version: 1,
				vendor: 'test',
				validate: () => ({
					issues: [
						{ message: 'm1', path: ['username'], code: 'bad1' },
						{ message: 'm2', path: ['username'], code: 'bad2' },
					],
				}),
			},
		};
		const { error } = renderError({}, {
			schema: custom,
			errorMessages: { bad1: first, bad2: second },
		});
		expect(error().textContent).toBe('first');
		expect(second).not.toHaveBeenCalled();
	});

	it('should resolve messages: field map > form map > defaultMessage > provider message', () => {
		const formMessages = {
			minLength: (e) => ['form', e.code, e.params.limit].join(':'),
			defaultMessage: (e) => 'default:'.concat(e.code),
		};
		const { error, form, rerender } = renderError({}, { errorMessages: formMessages });
		expect(error().textContent).toBe('form:minLength:3');
		rerender(
			<Form id="f" onSubmit={() => {}} schema={schema} data={{ username: 'ab' }} errorMessages={formMessages}>
				<FieldError name="username" errorMessages={{ minLength: () => 'field' }} />
			</Form>,
		);
		expect(error().textContent).toBe('field');
		rerender(
			<Form id="f" onSubmit={() => {}} schema={schema} data={{ username: 'ab' }} errorMessages={{ defaultMessage: () => 'dflt' }}>
				<FieldError name="username" />
			</Form>,
		);
		expect(error().textContent).toBe('dflt');
		rerender(
			<Form id="f" onSubmit={() => {}} schema={schema} data={{ username: 'ab' }}>
				<FieldError name="username" />
			</Form>,
		);
		expect(error().textContent).toBe(form().getFieldErrors('username')[0].raw.message);
	});

	it('should pass the normalized error (code, params, raw.data) to message callbacks', () => {
		const min = vi.fn((e) => String(e.raw.data).concat(' < ', String(e.params.limit)));
		const { container } = render(
			<Form id="f" onSubmit={() => {}} schema={schema} data={{ username: 'hugo', age: 3 }} errorMessages={{ min }}>
				<FieldError name="age" />
			</Form>,
		);
		expect(container.querySelector('.Jfv_FieldError').textContent).toBe('3 < 18');
		expect(min.mock.calls[0][0]).toMatchObject({ field: 'age', code: 'min', params: { comparison: '>=', limit: 18 } });
	});

	it('should render children instead of the message when provided', () => {
		const { error } = renderError({ children: <em>custom</em> });
		expect(error().innerHTML).toBe('<em>custom</em>');
	});

	it('should follow a new errorMessages map identity on the form', () => {
		const Parent = () => {
			const [messages, setMessages] = useState({ minLength: () => 'one' });
			return (
				<Form id="f" onSubmit={() => {}} schema={schema} data={{ username: 'ab' }} errorMessages={messages}>
					<FieldError name="username" />
					<button type="button" onClick={() => setMessages({ minLength: () => 'two' })}>swap</button>
				</Form>
			);
		};
		const { container } = render(<Parent />);
		expect(container.querySelector('.Jfv_FieldError').textContent).toBe('one');
		fireEvent.click(container.querySelector('button'));
		expect(container.querySelector('.Jfv_FieldError').textContent).toBe('two');
	});
});

describe('markup', () => {
	it('should have role="alert" by default, overridable, and a deterministic id prefixed by the form id', () => {
		const { error, rerender } = renderError();
		expect(error().getAttribute('role')).toBe('alert');
		expect(error().id).toBe('f-error-username');
		rerender(
			<Form id="f" onSubmit={() => {}} schema={schema} data={{ username: 'ab' }}>
				<FieldError name="username" role="status" id="custom" component="p" className="x" />
			</Form>,
		);
		const p = document.querySelector('p.Jfv_FieldError');
		expect(p.getAttribute('role')).toBe('status');
		expect(p.id).toBe('custom');
		expect(p.className).toBe('Jfv_FieldError x');
	});

	it('should add isTouched / isSubmitted classes', () => {
		const { error, form, container } = renderError();
		expect(error().className).toBe('Jfv_FieldError');
		act(() => form().touch('username'));
		expect(error().className).toBe('Jfv_FieldError isTouched');
		fireEvent.submit(container.querySelector('form'));
		expect(error().className).toBe('Jfv_FieldError isSubmitted isTouched');
	});
});

describe('registration', () => {
	it('should register its effective id on mount (even while hidden), re-register on id change, unregister on unmount', () => {
		const { form, rerender, unmount } = renderError({}, { data: { username: 'hugo' } });
		expect(form().getState().fieldErrorRegistry).toEqual([
			{ key: expect.any(String), name: 'username', id: 'f-error-username' },
		]);
		const { key } = form().getState().fieldErrorRegistry[0];
		rerender(
			<Form id="f" onSubmit={() => {}} schema={schema} data={{ username: 'hugo' }}>
				<Capture onForm={() => {}} />
				<FieldError name="username" id="custom" />
			</Form>,
		);
		expect(form().getState().fieldErrorRegistry).toEqual([{ key, name: 'username', id: 'custom' }]);
		unmount();
		expect(form().getState().fieldErrorRegistry).toEqual([]);
	});

	it('should throw outside a <Form> without a form prop, and honor the form prop', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => render(<FieldError name="a" />)).toThrow(/<FieldError> must be rendered inside a <Form>/);
		spy.mockRestore();
		const Outside = () => {
			const form = useForm({ schema, data: { username: 'ab' }, id: 'x' });
			return (
				<>
					<Form form={form} onSubmit={() => {}} />
					<FieldError name="username" form={form} />
				</>
			);
		};
		const { container } = render(<Outside />);
		expect(container.querySelector('.Jfv_FieldError').id).toBe('x-error-username');
	});

	it('should update a message that reads raw.data when the value changes', () => {
		const Parent = () => {
			const [data, setData] = useState({ username: 'a' });
			return (
				<Form
					id="f"
					onSubmit={() => {}}
					schema={schema}
					data={data}
					onChange={setData}
					throttleDuration={0}
					errorMessages={{ minLength: (e) => 'got '.concat(String(e.raw.data)) }}
				>
					<Field name="username" />
					<FieldError name="username" />
				</Form>
			);
		};
		const { container } = render(<Parent />);
		expect(container.querySelector('.Jfv_FieldError').textContent).toBe('got a');
		fireEvent.change(container.querySelector('input'), { target: { name: 'username', value: 'ab' } });
		expect(container.querySelector('.Jfv_FieldError').textContent).toBe('got ab');
	});

	it('should keep the IDREF order when a FieldError changes its id (in-place update)', () => {
		const Harness = ({ firstId }) => (
			<Form id="f" onSubmit={() => {}} schema={schema} data={{ username: 'ab' }}>
				<Field name="username" />
				<FieldError name="username" id={firstId} />
				<FieldError name="username" id="second" />
			</Form>
		);
		const { container, rerender } = render(<Harness firstId="first" />);
		fireEvent.blur(container.querySelector('input'));
		expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('first second');
		rerender(<Harness firstId="first2" />);
		expect(container.querySelector('input').getAttribute('aria-describedby')).toBe('first2 second');
	});

	it('does not loop when a hook-mode owner passes an inline errorMessages literal', () => {
		let renders = 0;
		const Owner = () => {
			renders += 1;
			const [tick, setTick] = useState(0);
			const form = useForm({
				schema, data: { username: 'ab' }, errorMessages: { minLength: () => 'inline '.concat(String(tick)) },
			});
			return (
				<Form form={form} onSubmit={() => {}}>
					<FieldError name="username" />
					<button type="button" onClick={() => setTick((t) => t + 1)}>tick</button>
				</Form>
			);
		};
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { container } = render(<React.StrictMode><Owner /></React.StrictMode>);
		expect(container.querySelector('.Jfv_FieldError').textContent).toBe('inline 0');
		fireEvent.click(container.querySelector('button'));
		expect(container.querySelector('.Jfv_FieldError').textContent).toBe('inline 1');
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
		// StrictMode double-renders: mount (2) + one state update (2).
		expect(renders).toBeLessThanOrEqual(4);
	});

	it('should re-render when a validation run yields a structurally different error (raw.data)', () => {
		let renders = 0;
		const Probe = (props) => { renders += 1; return <div {...props} />; };
		const Parent = () => {
			const [data, setData] = useState({ username: 'a' });
			return (
				<Form id="f" onSubmit={() => {}} schema={schema} data={data} onChange={setData} throttleDuration={0}>
					<Field name="username" />
					<FieldError name="username" component={Probe} />
				</Form>
			);
		};
		const { container } = render(<Parent />);
		expect(renders).toBe(1);
		fireEvent.change(container.querySelector('input'), { target: { name: 'username', value: 'ab' } });
		expect(renders).toBe(2);
		fireEvent.change(container.querySelector('input'), { target: { name: 'username', value: 'abcd' } });
		// Valid now: the component renders null, the probe is not rendered.
		expect(renders).toBe(2);
	});
});
