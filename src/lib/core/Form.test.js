import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { renderToString } from 'react-dom/server';
import {
	act, fireEvent, render, screen,
} from '@testing-library/react';

import { ajvSchema } from '../providers/ajv';
import { Form } from './Form';
import { Field } from './Field';
import { FieldError } from './FieldError';
import { useForm } from './useForm';
import { useFormContext } from './Context';

const testSchema = {
	type: 'object',
	properties: { type: { type: 'string', enum: ['te', 'ta'] } },
	required: ['type'],
};
const schema = ajvSchema(testSchema);

const Capture = ({ onForm }) => {
	onForm(useFormContext());
	return null;
};
const renderSugar = (props = {}, children = null) => {
	let form;
	const utils = render(
		<Form onSubmit={() => {}} schema={schema} {...props}>
			<Capture onForm={(f) => { form = f; }} />
			{children}
		</Form>,
	);
	return { ...utils, form: () => form };
};

const silenceReactErrors = () => vi.spyOn(console, 'error').mockImplementation(() => {});

describe('rendering', () => {
	it('should match snapshot (explicit id: auto ids differ between React majors)', () => {
		const { container } = render(<Form id="snap" onSubmit={() => {}} schema={schema} />);
		expect(container.querySelector('form')).toMatchSnapshot();
	});

	it('should render noValidate on the native form only, and forward the ref to the <form>', () => {
		const spy = silenceReactErrors(); // the <section> variant triggers the dev-time check
		const ref = React.createRef();
		const first = render(<Form onSubmit={() => {}} schema={schema} ref={ref} />);
		expect(first.container.querySelector('form').hasAttribute('novalidate')).toBe(true);
		expect(ref.current).toBe(first.container.querySelector('form'));
		first.unmount();
		const callbackRef = vi.fn();
		render(<Form onSubmit={() => {}} schema={schema} ref={callbackRef} />).unmount();
		expect(callbackRef).toHaveBeenNthCalledWith(1, expect.any(HTMLFormElement));
		expect(callbackRef).toHaveBeenLastCalledWith(null);
		// The id is fixed at mount (it seeds the store): mount a fresh form.
		const { container } = render(<Form onSubmit={() => {}} schema={schema} component="section" id="s" className="x" />);
		const section = container.querySelector('section');
		expect(section.hasAttribute('novalidate')).toBe(false);
		expect(section.id).toBe('s');
		expect(section.className).toBe('Jfv_Form x');
		spy.mockRestore();
	});

	it('should skip the dev-time check in production', () => {
		const saved = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		const spy = silenceReactErrors();
		try {
			render(<Form onSubmit={() => {}} schema={schema} component="section" id="prod" />);
			expect(spy).not.toHaveBeenCalled();
		} finally {
			process.env.NODE_ENV = saved;
			spy.mockRestore();
		}
	});

	it('should warn (dev) when the element at form.id is not the <form> element', () => {
		const spy = silenceReactErrors();
		render(
			<Form onSubmit={() => {}} schema={schema} component="section" id="sec">
				<Field name="type" />
			</Form>,
		);
		const messages = () => spy.mock.calls.map((call) => String(call[0]));
		expect(messages()).toEqual([
			expect.stringMatching(/must render a <form> element and forward the `id` prop.*Found a <section> at id "sec"/),
		]);
		spy.mockClear();

		const Forgetful = ({ children, onSubmit }) => <form onSubmit={onSubmit}>{children}</form>;
		render(
			<Form onSubmit={() => {}} schema={schema} component={Forgetful} id="lost">
				<Field name="type" />
			</Form>,
		);
		// Besides ours, React 18 warns that a plain function component cannot
		// receive the ref <Form> hands to its `component` (React 19 passes it
		// as a prop and stays silent): nothing else is acceptable.
		const ours = messages().filter((m) => m.includes('react-jsonschema-form-validation'));
		expect(ours).toHaveLength(1);
		expect(ours[0]).toMatch(/Found nothing at id "lost"/);
		const others = messages().filter((m) => !m.includes('react-jsonschema-form-validation'));
		expect(others.every((m) => /Function components cannot be given refs/.test(m))).toBe(true);
		spy.mockClear();

		const Forwarding = React.forwardRef((props, ref) => <form ref={ref} {...props} />);
		render(
			<Form onSubmit={() => {}} schema={schema} component={Forwarding} id="ok">
				<Field name="type" />
			</Form>,
		);
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it('should add the isSubmitted class after a submit attempt', () => {
		const { container } = render(<Form onSubmit={() => {}} schema={schema} data={{ type: 'nope' }} />);
		fireEvent.submit(container.querySelector('form'));
		expect(container.querySelector('form').classList.contains('isSubmitted')).toBe(true);
	});

	it('should generate unique auto ids per form (useId) and use them on the native form attribute', () => {
		const { container } = render(
			<>
				<Form onSubmit={() => {}} schema={schema}><Field name="a" /></Form>
				<Form onSubmit={() => {}} schema={schema}><Field name="a" /></Form>
			</>,
		);
		const [f1, f2] = container.querySelectorAll('form');
		expect(f1.id).toBeTruthy();
		expect(f1.id).not.toBe(f2.id);
		const [i1, i2] = container.querySelectorAll('input');
		expect(i1.getAttribute('form')).toBe(f1.id);
		expect(i2.getAttribute('form')).toBe(f2.id);
	});
});

describe('submit', () => {
	it('should call onSubmit when valid, not when invalid', () => {
		const onSubmit = vi.fn();
		const { container, rerender } = render(
			<Form data={{ type: 'te' }} onSubmit={onSubmit} schema={schema} />,
		);
		fireEvent.submit(container.querySelector('form'));
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0].defaultPrevented).toBe(true);
		rerender(<Form data={{ type: 'nope' }} onSubmit={onSubmit} schema={schema} />);
		fireEvent.submit(container.querySelector('form'));
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it('should reset the presentation state on a successful submit by default', () => {
		const onSubmit = vi.fn();
		const { form, container } = renderSugar({ data: { type: 'te' }, onSubmit });
		act(() => form().touch('type'));
		fireEvent.submit(container.querySelector('form'));
		expect(onSubmit).toHaveBeenCalled();
		expect(form().touchedFields).toEqual([]);
		expect(form().isSubmitted).toBe(false);
	});

	it('should keep touched/submitted state on a successful submit when resetOnSubmit is false', () => {
		const onSubmit = vi.fn();
		const { form, container } = renderSugar({ data: { type: 'te' }, onSubmit, resetOnSubmit: false });
		act(() => form().touch('type'));
		fireEvent.submit(container.querySelector('form'));
		expect(onSubmit).toHaveBeenCalled();
		expect(form().touchedFields).toEqual(['type']);
		expect(form().isSubmitted).toBe(true);
	});

	it('should focus the first invalid field after a failed submit', () => {
		const { container } = render(
			<Form data={{ type: 'nope' }} onSubmit={() => {}} schema={schema}>
				<Field name="other" />
				<Field name="type" />
			</Form>,
		);
		fireEvent.submit(container.querySelector('form'));
		expect(document.activeElement).toBe(container.querySelector('input[name="type"]'));
	});
});

describe('modes', () => {
	it('should throw when neither form nor schema is given, or when id accompanies form', () => {
		const spy = silenceReactErrors();
		expect(() => render(<Form onSubmit={() => {}} />)).toThrow(/needs either a `form` \(from useForm\) or a `schema`/);
		const Bad = () => {
			const form = useForm({ schema });
			return <Form form={form} id="x" onSubmit={() => {}} />;
		};
		expect(() => render(<Bad />)).toThrow(/received an `id` prop/);
		spy.mockRestore();
	});

	it('hook mode: shares the store with <Form>, the parent reads reactive state', () => {
		const Parent = () => {
			const [data, setData] = useState({ type: 'te' });
			const form = useForm({ schema, data, onChange: setData });
			return (
				<Form form={form} onSubmit={() => {}}>
					<Field name="type" />
					<button type="submit" disabled={!form.valid}>Save</button>
					<button type="button" onClick={form.reset}>Reset</button>
				</Form>
			);
		};
		const { container } = render(<Parent />);
		const [save] = container.querySelectorAll('button');
		expect(save.disabled).toBe(false);
		fireEvent.change(container.querySelector('input'), { target: { name: 'type', value: 'nope' } });
		expect(save.disabled).toBe(true);
		expect(container.querySelector('form').id).toBe(container.querySelector('input').getAttribute('form'));
	});

	it('hook mode: a Field rendered through a portal stays natively associated via the form attribute', () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const Portalish = () => {
			const [data, setData] = useState({ type: 'nope' });
			const form = useForm({
				schema, data, onChange: setData, id: 'checkout',
			});
			return (
				<>
					<Form form={form} onSubmit={() => {}} />
					{createPortal(
						<>
							<Field name="type" form={form} data-testid="outside" />
							<FieldError name="type" form={form} />
						</>,
						host,
					)}
				</>
			);
		};
		render(<Portalish />);
		const input = screen.getByTestId('outside');
		const formEl = document.getElementById('checkout');
		expect(formEl.contains(input)).toBe(false);
		expect(input.getAttribute('form')).toBe('checkout');
		expect(Array.from(formEl.elements)).toContain(input);
		expect(screen.getByRole('alert').id).toBe('checkout-error-type');
		fireEvent.change(input, { target: { name: 'type', value: 'te' } });
		expect(screen.queryByRole('alert')).toBeNull();
		document.body.removeChild(host);
	});

	it('sugar mode: Standard Schema objects are accepted directly', () => {
		const validate = vi.fn(() => ({ issues: [{ message: 'nope', path: ['type'], code: 'custom' }] }));
		const custom = { '~standard': { version: 1, vendor: 'test', validate } };
		const { form } = renderSugar({ schema: custom, data: { type: 'x' } });
		expect(validate).toHaveBeenCalledWith({ type: 'x' });
		expect(form().errors).toEqual([{
			field: 'type', code: 'custom', message: 'nope', params: {}, raw: { message: 'nope', path: ['type'], code: 'custom' },
		}]);
	});
});

describe('server rendering', () => {
	// Like a real server: no `window` / `document` at all (any access throws
	// a TypeError), so `useIsomorphicLayoutEffect` takes the server branch.
	const withoutDom = (fn) => {
		const saved = { document: global.document, window: global.window };
		Object.defineProperty(global, 'document', { value: undefined, configurable: true });
		Object.defineProperty(global, 'window', { value: undefined, configurable: true });
		try {
			return fn();
		} finally {
			Object.defineProperty(global, 'document', { value: saved.document, configurable: true });
			Object.defineProperty(global, 'window', { value: saved.window, configurable: true });
		}
	};
	const ssrSchema = ajvSchema({
		type: 'object',
		properties: { email: { type: 'string', format: 'email' } },
		required: ['email'],
	});

	it('renders sugar mode with the first validation applied and no DOM access', () => {
		const spy = silenceReactErrors();
		const html = withoutDom(() => renderToString(
			<Form id="s" data={{ email: 'nope' }} onSubmit={() => {}} schema={ssrSchema}>
				<Field name="email" />
				<FieldError name="email" />
			</Form>,
		));
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
		// React 18 serializes the attribute as `novalidate`, React 19 as `noValidate`.
		expect(html).toMatch(/<form id="s" class="Jfv_Form" novalidate=""/i);
		expect(html).toContain('form="s"');
		expect(html).toContain('id="s-error-email" role="alert"');
		expect(html).not.toContain('aria-invalid');
	});

	it('renders hook mode with form.valid already computed and useId-derived ids', () => {
		const Page = () => {
			const form = useForm({ schema: ssrSchema, data: { email: 'nope' } });
			return (
				<Form form={form} onSubmit={() => {}}>
					<Field name="email" />
					<button type="submit" disabled={!form.valid}>Save</button>
				</Form>
			);
		};
		const spy = silenceReactErrors();
		const html = withoutDom(() => renderToString(<Page />));
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
		const id = html.match(/<form id="([^"]*)"/)[1];
		expect(id).toBeTruthy();
		expect(html).toContain(`form="${id}"`);
		expect(html).toContain('<button type="submit" disabled="">Save</button>');
	});
});
