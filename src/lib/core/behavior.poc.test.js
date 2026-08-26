/**
 * POC behavioral suite: the 0.x class-internals tests ported to the public
 * v1 surface (`useForm` / `FormApi` / context). Seed for the PR 3 rewrite.
 */
import Ajv2020 from 'ajv/dist/2020';
import React, { useState } from 'react';
import {
	act, fireEvent, render, screen,
} from '@testing-library/react';

import {
	Form, Field, FieldError, useForm, useFormContext, createAjv,
} from '..';

const testSchema = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: ['te', 'ta'] },
	},
	required: ['type'],
};

const scrollIntoViewMock = vi.fn();
beforeAll(() => { Element.prototype.scrollIntoView = scrollIntoViewMock; });
beforeEach(() => { scrollIntoViewMock.mockClear(); });

/** Captures the context api for assertions from the outside. */
const Capture = ({ onForm }) => {
	onForm(useFormContext());
	return null;
};

const renderSugar = (props = {}, children = null) => {
	let form;
	const utils = render(
		<Form onSubmit={() => {}} schema={testSchema} {...props}>
			<Capture onForm={(f) => { form = f; }} />
			{children}
		</Form>,
	);
	return { ...utils, form: () => form };
};

describe('submit', () => {
	it('calls onSubmit when valid, not when invalid', () => {
		const onSubmit = vi.fn();
		const { container, rerender } = render(
			<Form data={{ type: 'te' }} onSubmit={onSubmit} schema={testSchema} />,
		);
		fireEvent.submit(container.querySelector('form'));
		expect(onSubmit).toHaveBeenCalledTimes(1);

		rerender(<Form data={{ type: 'nope' }} onSubmit={onSubmit} schema={testSchema} />);
		fireEvent.submit(container.querySelector('form'));
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it('resetOnSubmit (default) clears touched/submitted; false keeps them', () => {
		const onSubmit = vi.fn();
		const a = renderSugar({ data: { type: 'te' }, onSubmit });
		act(() => a.form().touch('type'));
		expect(a.form().touchedFields).toEqual(['type']);
		fireEvent.submit(a.container.querySelector('form'));
		expect(onSubmit).toHaveBeenCalled();
		expect(a.form().touchedFields).toEqual([]);
		expect(a.form().isSubmitted).toBe(false);
		a.unmount();

		const b = renderSugar({ data: { type: 'te' }, onSubmit, resetOnSubmit: false });
		act(() => b.form().touch('type'));
		fireEvent.submit(b.container.querySelector('form'));
		expect(b.form().touchedFields).toEqual(['type']);
		expect(b.form().isSubmitted).toBe(true);
	});

	it('reset() clears presentation state but keeps errors/valid (v1 semantics)', () => {
		const { form } = renderSugar({ data: { type: 'nope' } });
		act(() => form().touch('type'));
		fireEvent.submit(document.querySelector('form'));
		expect(form().isSubmitted).toBe(true);
		expect(form().valid).toBe(false);
		act(() => form().reset());
		expect(form().isSubmitted).toBe(false);
		expect(form().touchedFields).toEqual([]);
		expect(form().valid).toBe(false);
		expect(form().errors).toHaveLength(1);
	});

	it('reportValidity() reveals errors and focuses the first invalid field', () => {
		const { form, container } = renderSugar({ data: { type: 'nope' } }, <Field name="type" />);
		let valid;
		act(() => { valid = form().reportValidity(); });
		expect(valid).toBe(false);
		expect(form().isSubmitted).toBe(true);
		expect(document.activeElement).toBe(container.querySelector('input[name="type"]'));
		expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center', inline: 'nearest' });
	});

	it('requestSubmit() goes through the native form submission', () => {
		const onSubmit = vi.fn();
		const { form } = renderSugar({ data: { type: 'te' }, onSubmit });
		act(() => form().requestSubmit());
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it('submit revalidates synchronously even if a throttled run is pending', () => {
		const onSubmit = vi.fn();
		const Parent = () => {
			const [data, setData] = useState({ type: 'te' });
			return (
				<Form
					data={data}
					onChange={setData}
					onSubmit={onSubmit}
					schema={testSchema}
					throttleDuration={500}
				>
					<Field name="type" />
				</Form>
			);
		};
		const { container } = render(<Parent />);
		const input = container.querySelector('input');
		fireEvent.change(input, { target: { name: 'type', value: 'ta' } });
		fireEvent.change(input, { target: { name: 'type', value: 'nope' } });
		fireEvent.submit(container.querySelector('form'));
		expect(onSubmit).not.toHaveBeenCalled();
	});
});

describe('field helpers through the api', () => {
	const schema = {
		type: 'object',
		properties: {
			user: {
				type: 'object',
				properties: {
					email: { type: 'string', format: 'email' },
					age: { type: 'number', minimum: 18 },
				},
				required: ['email', 'age'],
			},
			tags: { type: 'array', items: { type: 'string', minLength: 2 } },
		},
	};

	it('getFieldErrors / isFieldInvalid support lists and wildcards', () => {
		const { form } = renderSugar({ schema, data: { user: { email: 'x', age: 3 }, tags: ['a', 'bb'] } });
		expect(form().getFieldErrors('user.email').map((e) => e.code)).toEqual(['format']);
		expect(form().getFieldErrors('user.age').map((e) => e.code)).toEqual(['min']);
		expect(form().getFieldErrors('tags.0').map((e) => e.code)).toEqual(['minLength']);
		expect(form().getFieldErrors('user.*')).toHaveLength(2);
		expect(form().isFieldInvalid(['nope', 'tags.0'])).toBe(true);
		expect(form().isFieldInvalid(['nope', 'tags.1'])).toBe(false);
		// raw keeps the AJV error (verbose: current value under raw.data)
		expect(form().getFieldErrors('user.age')[0].raw.data).toBe(3);
		expect(form().getFieldErrors('user.age')[0].params).toEqual({ comparison: '>=', limit: 18 });
	});

	it('touch / isFieldTouched / isTouched', () => {
		const { form } = renderSugar();
		expect(form().isTouched()).toBe(false);
		act(() => form().touch(['a', 'b']));
		act(() => form().touch('a'));
		expect(form().touchedFields).toEqual(['a', 'b']);
		expect(form().isFieldTouched('a')).toBe(true);
		expect(form().isFieldTouched(['z', 'b'])).toBe(true);
		expect(form().isFieldTouched('z')).toBe(false);
		expect(form().isTouched()).toBe(true);
	});

	it('handleFieldChange with an event, with (name, value), and without onChange', () => {
		const onChange = vi.fn();
		const { form, rerender } = renderSugar({ data: { a: 1 }, onChange });
		act(() => form().handleFieldChange({ target: { name: 'b', value: 'x' } }));
		expect(onChange).toHaveBeenLastCalledWith({ a: 1, b: 'x' }, { target: { name: 'b', value: 'x' } });
		act(() => form().handleFieldChange('c.d', 2));
		expect(onChange).toHaveBeenLastCalledWith({ a: 1, c: { d: 2 } }, { target: { name: 'c.d', value: 2 } });
		rerender(<Form onSubmit={() => {}} schema={testSchema}><Capture onForm={() => {}} /></Form>);
		expect(() => form().handleFieldChange('a', 1)).not.toThrow();
	});
});

describe('AJV provider through the form', () => {
	it('$data references, nested required, array paths', () => {
		const schema = {
			type: 'object',
			properties: {
				password: { type: 'string' },
				confirm: { type: 'string', const: { $data: '1/password' } },
				items: {
					type: 'array',
					items: { type: 'object', properties: { label: { type: 'string' } }, required: ['label'] },
				},
			},
			required: ['password'],
		};
		const { form } = renderSugar({ schema, data: { password: 'a', confirm: 'b', items: [{ label: 'x' }, {}] } });
		expect(form().errors.map((e) => [e.field, e.code])).toEqual([
			['confirm', 'const'],
			['items.1.label', 'required'],
		]);
	});

	it('accepts a custom Ajv2020 instance and rejects a non-validator', () => {
		const ajv2020 = new Ajv2020({ allErrors: true });
		const schema = { type: 'array', prefixItems: [{ type: 'number' }], items: false };
		const { form } = renderSugar({ ajv: ajv2020, schema, data: [1, 'x'] });
		expect(form().valid).toBe(false);
		expect(() => render(<Form ajv={42} onSubmit={() => {}} schema={{}} />)).toThrow(/compile\(schema\)/);
	});

	it('counts validator work: data change re-runs, touch/submit do not, schema change recompiles', () => {
		const ajv = createAjv();
		const counters = { compile: 0, run: 0 };
		const realCompile = ajv.compile.bind(ajv);
		ajv.compile = (s) => {
			counters.compile += 1;
			const validate = realCompile(s);
			const wrapped = (d) => {
				counters.run += 1;
				const r = validate(d);
				wrapped.errors = validate.errors;
				return r;
			};
			wrapped.errors = null;
			return wrapped;
		};
		const props = { ajv, onSubmit: () => {}, throttleDuration: 0 };
		const { form, rerender, container } = renderSugar({ ...props, data: { type: 'te' }, schema: testSchema });
		expect(counters).toEqual({ compile: 1, run: 1 });
		act(() => form().touch('type'));
		expect(counters.run).toBe(1);
		fireEvent.submit(container.querySelector('form'));
		// submit = reportValidity → one synchronous run (by design in v1)
		expect(counters.run).toBe(2);
		rerender(<Form {...props} data={{ type: 'NOPE' }} schema={testSchema}><Capture onForm={() => {}} /></Form>);
		expect(counters.run).toBe(3);
		expect(form().valid).toBe(false);
		rerender(<Form {...props} data={{ type: 'NOPE' }} schema={{ ...testSchema, required: [] }}><Capture onForm={() => {}} /></Form>);
		expect(counters.compile).toBe(2);
		expect(counters.run).toBe(4);
	});

	it('cancels the pending throttled validation on unmount', () => {
		vi.useFakeTimers();
		const ajv = createAjv();
		let runs = 0;
		const realCompile = ajv.compile.bind(ajv);
		ajv.compile = (s) => {
			const v = realCompile(s);
			const w = (d) => {
				runs += 1;
				const r = v(d);
				w.errors = v.errors;
				return r;
			};
			return w;
		};
		const props = {
			ajv, onSubmit: () => {}, schema: testSchema, throttleDuration: 100,
		};
		const { rerender, unmount } = render(<Form {...props} data={{ type: 'te' }} />);
		rerender(<Form {...props} data={{ type: 'ta' }} />);
		rerender(<Form {...props} data={{ type: 'x' }} />);
		const before = runs;
		unmount();
		vi.runAllTimers();
		expect(runs).toBe(before);
		vi.useRealTimers();
	});
});

describe('hook mode', () => {
	it('exposes reactive state to the parent and shares the store with <Form>', () => {
		const Parent = () => {
			const [data, setData] = useState({ type: 'te' });
			const form = useForm({ schema: testSchema, data, onChange: setData });
			return (
				<Form form={form} onSubmit={() => {}}>
					<Field name="type" />
					<button type="submit" disabled={!form.valid}>Save</button>
				</Form>
			);
		};
		const { container } = render(<Parent />);
		const button = container.querySelector('button');
		expect(button.disabled).toBe(false);
		fireEvent.change(container.querySelector('input'), { target: { name: 'type', value: 'nope' } });
		expect(button.disabled).toBe(true);
		expect(container.querySelector('form').id).toBe(container.querySelector('input').getAttribute('form'));
	});

	it('throws on <Form form id>, on a Field without a form, and honors the explicit form prop', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const Bad = () => {
			const form = useForm({ schema: testSchema });
			return <Form form={form} id="x" onSubmit={() => {}} />;
		};
		expect(() => render(<Bad />)).toThrow(/received an `id` prop/);
		expect(() => render(<Field name="a" />)).toThrow(/must be rendered inside a <Form>/);
		spy.mockRestore();

		const Portalish = () => {
			const [data, setData] = useState({ type: 'nope' });
			const form = useForm({
				schema: testSchema, data, onChange: setData, id: 'checkout',
			});
			return (
				<>
					<Form form={form} onSubmit={() => {}} />
					<Field name="type" form={form} data-testid="outside" />
					<FieldError name="type" form={form} />
				</>
			);
		};
		render(<Portalish />);
		const input = screen.getByTestId('outside');
		expect(input.getAttribute('form')).toBe('checkout');
		expect(document.getElementById('checkout').elements).toContain(input);
		expect(screen.getByRole('alert').id).toBe('checkout-error-type');
	});

	it('generates unique auto ids per form (useId)', () => {
		const { container } = render(
			<>
				<Form onSubmit={() => {}} schema={{}}><Field name="a" /></Form>
				<Form onSubmit={() => {}} schema={{}}><Field name="a" /></Form>
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

describe('FieldError / Field wiring', () => {
	it('shows the first error, custom messages keyed by normalized code, ARIA once revealed', () => {
		const schema = { type: 'object', properties: { age: { type: 'number', minimum: 18 } } };
		const { container } = render(
			<Form
				id="f"
				data={{ age: 3 }}
				errorMessages={{ min: (e) => String(e.raw.data).concat(' < ', String(e.params.limit)) }}
				onSubmit={() => {}}
				schema={schema}
			>
				<Field name="age" type="number" />
				<FieldError name="age" />
			</Form>,
		);
		const input = container.querySelector('input');
		const error = container.querySelector('.Jfv_FieldError');
		expect(error.textContent).toBe('3 < 18');
		expect(error.id).toBe('f-error-age');
		expect(error.getAttribute('role')).toBe('alert');
		expect(input.getAttribute('aria-invalid')).toBeNull();
		expect(input.getAttribute('aria-describedby')).toBeNull();
		fireEvent.blur(input);
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(input.getAttribute('aria-describedby')).toBe('f-error-age');
		expect(input.classList.contains('isTouched')).toBe(true);
		expect(input.classList.contains('isInvalid')).toBe(true);
		expect(error.classList.contains('isTouched')).toBe(true);
	});
});
