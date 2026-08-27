import React, { useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';

import { createAjv, ajvSchema } from '../providers/ajv';
import { Form } from './Form';
import { Field } from './Field';
import { useForm } from './useForm';
import { useFormContext } from './Context';

const testSchema = {
	type: 'object',
	properties: { type: { type: 'string', enum: ['te', 'ta'] } },
	required: ['type'],
};
const standard = (schema) => ajvSchema(schema);
// Stable identity: a schema created during render would re-trigger the
// revalidation effect on every re-render.
const stableSchema = standard(testSchema);

// Mounts a hook-mode form and hands its api to the test.
const renderForm = (config = {}, children = null, formProps = {}) => {
	let api;
	const Harness = () => {
		api = useForm({ schema: stableSchema, ...config });
		return <Form form={api} onSubmit={() => {}} {...formProps}>{children}</Form>;
	};
	const utils = render(<Harness />);
	return { ...utils, form: () => api };
};

// Counts real validator runs / compilations.
const countingAjv = () => {
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
	return { ajv, counters };
};

const scrollIntoViewMock = vi.fn();
beforeAll(() => { Element.prototype.scrollIntoView = scrollIntoViewMock; });
beforeEach(() => { scrollIntoViewMock.mockClear(); });

describe('FormApi identity and reactive getters', () => {
	it('should return the same api object across renders and expose the current snapshot', () => {
		const apis = [];
		const Harness = () => {
			const [data, setData] = useState({ type: 'te' });
			const form = useForm({ schema: standard(testSchema), data, onChange: setData });
			apis.push(form);
			return (
				<Form form={form} onSubmit={() => {}}>
					<Field name="type" />
					<output name="valid">{String(form.valid)}</output>
				</Form>
			);
		};
		const { container } = render(<Harness />);
		expect(container.querySelector('output').textContent).toBe('true');
		fireEvent.change(container.querySelector('input'), { target: { name: 'type', value: 'nope' } });
		expect(container.querySelector('output').textContent).toBe('false');
		expect(new Set(apis).size).toBe(1);
		expect(apis[0].errors.map((e) => e.code)).toEqual(['enum']);
		expect(apis[0].getState()).toMatchObject({ valid: false, isSubmitted: false });
	});

	it('should validate synchronously at creation (no invalid → valid flash)', () => {
		const seen = [];
		const Harness = () => {
			const form = useForm({ schema: standard(testSchema), data: { type: 'nope' } });
			seen.push(form.valid);
			return <Form form={form} onSubmit={() => {}} />;
		};
		render(<Harness />);
		expect(seen[0]).toBe(false);
	});

	it('should use the provided id or a React useId one', () => {
		expect(renderForm({ id: 'checkout' }).form().id).toBe('checkout');
		const auto = renderForm().form().id;
		expect(auto).toBeTruthy();
		expect(auto).not.toBe('checkout');
	});

	it('should not expose the hooks-only members on the api', () => {
		const api = renderForm().form();
		expect(api).not.toHaveProperty('bindSubmit');
		expect(api).not.toHaveProperty('revalidate');
		expect(api).not.toHaveProperty('setErrorMessages');
		expect(api).not.toHaveProperty('dispose');
	});
});

describe('reset()', () => {
	it('should clear touched/submitted but keep errors and valid (presentation-only)', () => {
		const { form, container } = renderForm({ data: { type: 'nope' } });
		act(() => form().touch('type'));
		fireEvent.submit(container.querySelector('form'));
		expect(form().isSubmitted).toBe(true);
		expect(form().touchedFields).toEqual(['type']);
		act(() => form().reset());
		expect(form().isSubmitted).toBe(false);
		expect(form().touchedFields).toEqual([]);
		expect(form().valid).toBe(false);
		expect(form().errors).toHaveLength(1);
	});

	it('should keep the FieldError registry across a reset', () => {
		const { form } = renderForm({ id: 'f' });
		act(() => form().registerFieldError('k', 'type', 'x'));
		act(() => form().reset());
		expect(form().getState().fieldErrorRegistry).toEqual([{ key: 'k', name: 'type', id: 'x' }]);
	});
});

describe('checkValidity() / reportValidity() / requestSubmit()', () => {
	it('checkValidity validates now without revealing errors', () => {
		const { form } = renderForm({ data: { type: 'nope' } });
		let valid;
		act(() => { valid = form().checkValidity(); });
		expect(valid).toBe(false);
		expect(form().isSubmitted).toBe(false);
	});

	it('reportValidity reveals, focuses and scrolls to the first invalid field', () => {
		const { form, container } = renderForm({ data: { type: 'nope' } }, <Field name="type" />);
		let valid;
		act(() => { valid = form().reportValidity(); });
		expect(valid).toBe(false);
		expect(form().isSubmitted).toBe(true);
		expect(document.activeElement).toBe(container.querySelector('input[name="type"]'));
		expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center', inline: 'nearest' });
	});

	it('reportValidity returns true on a valid form and does not scroll', () => {
		const { form } = renderForm({ data: { type: 'te' } }, <Field name="type" />);
		let valid;
		act(() => { valid = form().reportValidity(); });
		expect(valid).toBe(true);
		expect(form().isSubmitted).toBe(true);
		expect(scrollIntoViewMock).not.toHaveBeenCalled();
	});

	it('reportValidity honors scrollToError={false} and maps legacy scroll options', () => {
		const a = renderForm({ data: { type: 'nope' } }, <Field name="type" />, { scrollToError: false });
		act(() => a.form().reportValidity());
		expect(scrollIntoViewMock).not.toHaveBeenCalled();
		expect(document.activeElement).not.toBe(a.container.querySelector('input'));
		a.unmount();

		const b = renderForm({ data: { type: 'nope' } }, <Field name="type" />, {
			scrollOptions: { align: 'top', offset: 20, duration: 100 },
		});
		act(() => b.form().reportValidity());
		expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start', inline: 'nearest' });
		b.unmount();

		const c = renderForm({ data: { type: 'nope' } }, <Field name="type" />, {
			scrollOptions: { behavior: 'auto', block: 'end', inline: 'start' },
		});
		act(() => c.form().reportValidity());
		expect(scrollIntoViewMock).toHaveBeenLastCalledWith({ behavior: 'auto', block: 'end', inline: 'start' });
	});

	it('reportValidity focuses the invalid field of ITS form when two forms share a field name', () => {
		let second;
		const Two = () => {
			const a = useForm({ schema: stableSchema, data: { type: 'nope' }, id: 'a' });
			second = useForm({ schema: stableSchema, data: { type: 'nope' }, id: 'b' });
			return (
				<>
					<Form form={a} onSubmit={() => {}}><Field name="type" /></Form>
					<Form form={second} onSubmit={() => {}}><Field name="type" /></Form>
				</>
			);
		};
		render(<Two />);
		act(() => second.reportValidity());
		expect(document.activeElement.getAttribute('form')).toBe('b');
	});

	it('reportValidity skips focus when no element carries the field name, and copes without scrollIntoView', () => {
		const { form } = renderForm({ data: { type: 'nope' } });
		expect(() => act(() => form().reportValidity())).not.toThrow();
		const saved = Element.prototype.scrollIntoView;
		delete Element.prototype.scrollIntoView;
		const b = renderForm({ data: { type: 'nope' } }, <Field name="type" />);
		expect(() => act(() => b.form().reportValidity())).not.toThrow();
		expect(document.activeElement).toBe(b.container.querySelector('input'));
		Element.prototype.scrollIntoView = saved;
	});

	it('requestSubmit goes through the native form submission when mounted', () => {
		const onSubmit = vi.fn();
		const { form } = renderForm({ data: { type: 'te' } }, null, { onSubmit });
		act(() => form().requestSubmit());
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it('requestSubmit throws when no <Form> is mounted for the api', () => {
		let api;
		const Harness = () => {
			api = useForm({ schema: standard(testSchema), id: 'orphan' });
			return null;
		};
		render(<Harness />);
		expect(() => api.requestSubmit()).toThrow(/requestSubmit\(\) needs a mounted <Form> \(id "orphan"\)/);
	});
});

describe('field helpers', () => {
	const schema = {
		type: 'object',
		properties: {
			user: {
				type: 'object',
				properties: { email: { type: 'string', format: 'email' }, age: { type: 'number', minimum: 18 } },
				required: ['email', 'age'],
			},
			tags: { type: 'array', items: { type: 'string', minLength: 2 } },
		},
	};

	it('getFieldErrors / isFieldInvalid support lists, wildcards, and expose params/raw', () => {
		const { form } = renderForm({ schema: standard(schema), data: { user: { email: 'x', age: 3 }, tags: ['a', 'bb'] } });
		expect(form().getFieldErrors('user.email').map((e) => e.code)).toEqual(['format']);
		expect(form().getFieldErrors('user.age').map((e) => e.code)).toEqual(['min']);
		expect(form().getFieldErrors('tags.0').map((e) => e.code)).toEqual(['minLength']);
		expect(form().getFieldErrors('user.*')).toHaveLength(2);
		expect(form().isFieldInvalid(['nope', 'tags.0'])).toBe(true);
		expect(form().isFieldInvalid(['nope', 'tags.1'])).toBe(false);
		expect(form().getFieldErrors('user.age')[0].raw.data).toBe(3);
		expect(form().getFieldErrors('user.age')[0].params).toEqual({ comparison: '>=', limit: 18 });
	});

	it('touch / isFieldTouched / isTouched deduplicate and support lists', () => {
		const { form } = renderForm();
		expect(form().isTouched()).toBe(false);
		act(() => form().touch(['a', 'b']));
		act(() => form().touch('a'));
		expect(form().touchedFields).toEqual(['a', 'b']);
		expect(form().isFieldTouched('a')).toBe(true);
		expect(form().isFieldTouched(['z', 'b'])).toBe(true);
		expect(form().isFieldTouched('z')).toBe(false);
		expect(form().isTouched()).toBe(true);
	});

	it('handleFieldChange works with an event, with (name, value), and without onChange', () => {
		const onChange = vi.fn();
		const { form, rerender } = renderForm({ data: { a: 1 }, onChange });
		act(() => form().handleFieldChange({ target: { name: 'b', value: 'x' } }));
		expect(onChange).toHaveBeenLastCalledWith({ a: 1, b: 'x' }, { target: { name: 'b', value: 'x' } });
		act(() => form().handleFieldChange('c.d', 2));
		expect(onChange).toHaveBeenLastCalledWith({ a: 1, c: { d: 2 } }, { target: { name: 'c.d', value: 2 } });
		// Same harness, no onChange: the call is a no-op.
		let api;
		const NoChange = () => {
			api = useForm({ schema: standard(testSchema) });
			return <Form form={api} onSubmit={() => {}} />;
		};
		rerender(<NoChange />);
		expect(() => api.handleFieldChange('a', 1)).not.toThrow();
	});
});

describe('FieldError registry', () => {
	it('registers in mount order, updates in place, ignores identical re-registration, unregisters by key', () => {
		const { form } = renderForm();
		const listener = vi.fn();
		form().subscribe(listener);
		act(() => form().registerFieldError('k1', 'a', 'id-a'));
		act(() => form().registerFieldError('k2', 'b', 'id-b'));
		act(() => form().registerFieldError('k1', 'a', 'id-a'));
		expect(listener).toHaveBeenCalledTimes(2);
		act(() => form().registerFieldError('k1', 'a', 'id-a2'));
		expect(form().getState().fieldErrorRegistry.map((e) => e.id)).toEqual(['id-a2', 'id-b']);
		expect(form().getFieldErrorDescribedBy('a')).toBe('id-a2');
		act(() => form().unregisterFieldError('nope'));
		expect(listener).toHaveBeenCalledTimes(3);
		act(() => form().unregisterFieldError('k1'));
		expect(form().getState().fieldErrorRegistry.map((e) => e.key)).toEqual(['k2']);
		expect(form().getFieldErrorDescribedBy('a')).toBeUndefined();
	});
});

describe('revalidation', () => {
	it('re-runs on data change only, recompiles on schema change, submit runs one synchronous validation', () => {
		const { ajv, counters } = countingAjv();
		const schemaA = ajvSchema(testSchema, { ajv });
		let api;
		const Harness = ({ data, schema }) => {
			api = useForm({ schema, data, throttleDuration: 0 });
			return <Form form={api} onSubmit={() => {}} />;
		};
		const dataA = { type: 'te' };
		const { rerender, container } = render(<Harness data={dataA} schema={schemaA} />);
		expect(counters).toEqual({ compile: 1, run: 1 });
		act(() => api.touch('type'));
		rerender(<Harness data={dataA} schema={schemaA} />);
		expect(counters.run).toBe(1);
		fireEvent.submit(container.querySelector('form'));
		expect(counters.run).toBe(2);
		rerender(<Harness data={{ type: 'NOPE' }} schema={schemaA} />);
		expect(counters.run).toBe(3);
		expect(api.valid).toBe(false);
		const schemaB = ajvSchema({ ...testSchema, required: [] }, { ajv });
		rerender(<Harness data={{ type: 'NOPE' }} schema={schemaB} />);
		expect(counters.compile).toBe(2);
		expect(counters.run).toBe(4);
	});

	it('re-validates when throttleDuration changes and cancels a pending run on unmount', () => {
		vi.useFakeTimers();
		const { ajv, counters } = countingAjv();
		const schema = ajvSchema(testSchema, { ajv });
		const Harness = ({ data, throttleDuration }) => {
			const form = useForm({ schema, data, throttleDuration });
			return <Form form={form} onSubmit={() => {}} />;
		};
		const dataA = { type: 'te' };
		const { rerender, unmount } = render(<Harness data={dataA} throttleDuration={100} />);
		expect(counters.run).toBe(1);
		rerender(<Harness data={dataA} throttleDuration={200} />);
		expect(counters.run).toBe(2);
		// Two quick changes: leading run + one pending trailing run.
		rerender(<Harness data={{ type: 'ta' }} throttleDuration={200} />);
		rerender(<Harness data={{ type: 'x' }} throttleDuration={200} />);
		const before = counters.run;
		unmount();
		vi.runAllTimers();
		expect(counters.run).toBe(before);
		vi.useRealTimers();
	});

	it('checkValidity() runs now and drops the pending throttled run', () => {
		vi.useFakeTimers();
		const { ajv, counters } = countingAjv();
		const schema = ajvSchema(testSchema, { ajv });
		let api;
		const Harness = ({ data }) => {
			api = useForm({ schema, data, throttleDuration: 200 });
			return <Form form={api} onSubmit={() => {}} />;
		};
		const { rerender } = render(<Harness data={{ type: 'te' }} />);
		rerender(<Harness data={{ type: 'ta' }} />);
		rerender(<Harness data={{ type: 'x' }} />);
		const before = counters.run;
		let valid;
		act(() => { valid = api.checkValidity(); });
		expect(valid).toBe(false);
		expect(counters.run).toBe(before + 1);
		vi.runAllTimers();
		expect(counters.run).toBe(before + 1);
		vi.useRealTimers();
	});

	it('submit revalidates synchronously even with a throttled run pending (never submits stale data)', () => {
		const onSubmit = vi.fn();
		const Parent = () => {
			const [data, setData] = useState({ type: 'te' });
			const form = useForm({
				schema: standard(testSchema), data, onChange: setData, throttleDuration: 500,
			});
			return (
				<Form form={form} onSubmit={onSubmit}>
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

	it('does not repeat the creation-time validation on mount, even under StrictMode', () => {
		const { ajv, counters } = countingAjv();
		const schema = ajvSchema(testSchema, { ajv });
		const data = { type: 'te' };
		const Harness = () => {
			const form = useForm({ schema, data, throttleDuration: 0 });
			return <Form form={form} onSubmit={() => {}} />;
		};
		render(<React.StrictMode><Harness /></React.StrictMode>);
		// StrictMode double-invokes the useState initializer (two stores are
		// created, one validation each) and re-runs the mount effects: the
		// last-validated tuple keeps the effect from validating a third time.
		expect(counters.compile).toBe(1);
		expect(counters.run).toBe(2);
	});
});

describe('render-time data objects', () => {
	it('does not loop when the owner rebuilds INVALID data on every render, before and after a state update', () => {
		const { ajv, counters } = countingAjv();
		const schema = ajvSchema(testSchema, { ajv });
		let renders = 0;
		let api;
		const Owner = () => {
			renders += 1;
			const [tick, setTick] = useState(0);
			// Anti-pattern, but common: a fresh (invalid) object each render.
			api = useForm({ schema, data: { ...{ type: 'nope' } }, throttleDuration: 0 });
			return (
				<Form form={api} onSubmit={() => {}}>
					<output>{tick}</output>
					<button type="button" onClick={() => setTick((t) => t + 1)}>tick</button>
				</Form>
			);
		};
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { container } = render(<React.StrictMode><Owner /></React.StrictMode>);
		expect(api.valid).toBe(false);
		fireEvent.click(container.querySelector('button'));
		expect(container.querySelector('output').textContent).toBe('1');
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
		// Structurally equal data never re-validates: only the creation
		// runs (StrictMode double-invokes the initializer).
		expect(counters.run).toBe(2);
		// StrictMode double-renders: mount (2) + one state update (2).
		expect(renders).toBeLessThanOrEqual(4);
	});

	it('re-validates when data changes structurally, even through a fresh object', () => {
		let api;
		const Harness = ({ value }) => {
			api = useForm({ schema: stableSchema, data: { type: value }, throttleDuration: 0 });
			return <Form form={api} onSubmit={() => {}} />;
		};
		const { rerender } = render(<Harness value="te" />);
		expect(api.valid).toBe(true);
		rerender(<Harness value="nope" />);
		expect(api.valid).toBe(false);
	});
});

describe('errorMessages', () => {
	it('is read from the latest config (no store write) and follows identity changes', () => {
		const first = { min: () => 'first' };
		const second = { min: () => 'second' };
		let api;
		const Harness = ({ errorMessages }) => {
			api = useForm({ schema: stableSchema, errorMessages });
			return <Form form={api} onSubmit={() => {}} />;
		};
		const { rerender } = render(<Harness errorMessages={first} />);
		expect(api.errorMessages).toBe(first);
		const listener = vi.fn();
		api.subscribe(listener);
		rerender(<Harness errorMessages={second} />);
		expect(api.errorMessages).toBe(second);
		expect(listener).not.toHaveBeenCalled();
		expect(api.getState()).not.toHaveProperty('errorMessages');
	});
});

describe('defaults', () => {
	it('checkValidity() and re-validation fall back to an empty object when data is undefined', () => {
		let api;
		const Harness = ({ data }) => {
			api = useForm({ schema: stableSchema, data, throttleDuration: 0 });
			return <Form form={api} onSubmit={() => {}} />;
		};
		const { rerender } = render(<Harness data={{ type: 'te' }} />);
		expect(api.valid).toBe(true);
		rerender(<Harness data={undefined} />);
		expect(api.valid).toBe(false);
		expect(api.errors.map((e) => e.code)).toEqual(['required']);
		let valid;
		act(() => { valid = api.checkValidity(); });
		expect(valid).toBe(false);
	});

	it('submitting a hook-mode form without onSubmit is a no-op after validation', () => {
		const { form, container } = renderForm({ data: { type: 'te' } }, null, { onSubmit: undefined });
		expect(() => fireEvent.submit(container.querySelector('form'))).not.toThrow();
		expect(form().isSubmitted).toBe(false);
	});

	it('getInternals() rejects objects that were not created by useForm()', async () => {
		const { getInternals } = await import('./internals');
		expect(() => getInternals({})).toThrow(/not a form object created by useForm\(\)/);
	});

	it('reportValidity falls back to a document lookup when the form element is not a <form>', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { form, container } = renderForm({ data: { type: 'nope' } }, <Field name="type" />, { component: 'section' });
		act(() => form().reportValidity());
		expect(document.activeElement).toBe(container.querySelector('input[name="type"]'));
		spy.mockRestore();
	});

	it('does not re-render the owner when the FieldError registry changes', () => {
		let ownerRenders = 0;
		let api;
		const Registrar = () => {
			const form = useFormContext();
			React.useEffect(() => {
				form.registerFieldError('late', 'type', 'late-id');
				return () => form.unregisterFieldError('late');
			}, [form]);
			return null;
		};
		const Owner = () => {
			ownerRenders += 1;
			api = useForm({ schema: stableSchema, data: { type: 'te' } });
			return <Form form={api} onSubmit={() => {}}><Registrar /></Form>;
		};
		render(<Owner />);
		expect(api.getState().fieldErrorRegistry).toHaveLength(1);
		expect(ownerRenders).toBe(1);
		act(() => api.touch('type'));
		expect(ownerRenders).toBe(2);
	});

	it('reportValidity focuses the first control of a radio group (RadioNodeList)', () => {
		const { form, container } = renderForm({ data: { type: 'nope' } }, (
			<>
				<Field name="type" type="radio" value="te" />
				<Field name="type" type="radio" value="ta" />
			</>
		));
		act(() => form().reportValidity());
		expect(document.activeElement).toBe(container.querySelector('input[value="te"]'));
	});
});

describe('useFormContext inside a hook-mode form', () => {
	it('returns the same api object the parent created', () => {
		let fromContext;
		const Probe = () => { fromContext = useFormContext(); return null; };
		const { form } = renderForm({}, <Probe />);
		expect(fromContext).toBe(form());
	});
});
