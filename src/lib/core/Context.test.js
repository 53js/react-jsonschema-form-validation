import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { ajvSchema } from '../providers/ajv';
import {
	FormContext, useFormContext, useResolvedForm, withFormContext,
} from './Context';
import { Field } from './Field';
import { Form } from './Form';
import { useForm } from './useForm';

const schema = ajvSchema({ type: 'object' });

describe('FormContext', () => {
	it('should be a React context defaulting to undefined', () => {
		expect(FormContext.Provider).toBeDefined();
		expect(FormContext.Consumer).toBeDefined();
		let value = 'unset';
		const Probe = () => { value = React.useContext(FormContext); return null; };
		render(<Probe />);
		expect(value).toBeUndefined();
	});
});

describe('useFormContext', () => {
	it('should return the FormApi of the nearest <Form>', () => {
		let seen;
		const Probe = () => { seen = useFormContext(); return null; };
		render(<Form id="ctx" onSubmit={() => {}} schema={schema}><Probe /></Form>);
		expect(seen.id).toBe('ctx');
		expect(typeof seen.reset).toBe('function');
	});

	it('should throw outside a <Form>', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const Probe = () => { useFormContext(); return null; };
		expect(() => render(<Probe />)).toThrow(
			'react-jsonschema-form-validation: useFormContext / withFormContext must be used inside a <Form> component.',
		);
		spy.mockRestore();
	});
});

describe('useFormContext reactivity (0.x contract)', () => {
	const invalidSchema = ajvSchema({
		type: 'object', properties: { a: { type: 'string', minLength: 2 } }, required: ['a'],
	});

	it('re-renders a stable consumer when validity changes and on submit', () => {
		let renders = 0;
		const Status = React.memo(() => {
			renders += 1;
			const { valid, isSubmitted } = useFormContext();
			return <output>{String(valid)}/{String(isSubmitted)}</output>;
		});
		const Parent = () => {
			const [data, setData] = React.useState({ a: 'ok' });
			return (
				<Form
					onSubmit={() => {}}
					schema={invalidSchema}
					data={data}
					onChange={setData}
					throttleDuration={0}
					resetOnSubmit={false}
				>
					<Field name="a" />
					<Status />
				</Form>
			);
		};
		const { container } = render(<Parent />);
		const output = () => container.querySelector('output').textContent;
		expect(output()).toBe('true/false');
		fireEvent.change(container.querySelector('input'), { target: { name: 'a', value: 'x' } });
		expect(output()).toBe('false/false');
		fireEvent.submit(container.querySelector('form'));
		expect(output()).toBe('false/true');
		expect(renders).toBe(3);
	});

	it('withFormContext callbacks re-run when the form state changes', () => {
		const Parent = () => {
			const [data, setData] = React.useState({ a: 'ok' });
			return (
				<Form
					onSubmit={() => {}}
					schema={invalidSchema}
					data={data}
					onChange={setData}
					throttleDuration={0}
				>
					<Field name="a" />
					{withFormContext((form) => <span>{form.valid ? 'ok' : 'ko'}</span>)}
				</Form>
			);
		};
		const { container } = render(<Parent />);
		expect(container.querySelector('span').textContent).toBe('ok');
		fireEvent.change(container.querySelector('input'), { target: { name: 'a', value: 'x' } });
		expect(container.querySelector('span').textContent).toBe('ko');
	});
});

describe('withFormContext (legacy render prop)', () => {
	it('should call back with the FormApi', () => {
		const { container } = render(
			<Form id="ctx" onSubmit={() => {}} schema={schema}>
				{withFormContext((form) => <span>{form.id}</span>)}
			</Form>,
		);
		expect(container.querySelector('span').textContent).toBe('ctx');
	});

	it('should throw outside a <Form>', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => render(withFormContext(() => null))).toThrow(/must be used inside a <Form>/);
		spy.mockRestore();
	});
});

describe('useResolvedForm (form-owner resolution)', () => {
	it('should prefer the explicit form, then the context, then throw naming the component', () => {
		const seen = {};
		const Probe = ({ form, label }) => { seen[label] = useResolvedForm(form, 'Probe'); return null; };
		const Harness = () => {
			const explicit = useForm({ schema, id: 'explicit' });
			return (
				<Form id="ctx" onSubmit={() => {}} schema={schema}>
					<Probe label="ctx" />
					<Probe label="explicit" form={explicit} />
				</Form>
			);
		};
		render(<Harness />);
		expect(seen.ctx.id).toBe('ctx');
		expect(seen.explicit.id).toBe('explicit');
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => render(<Probe label="none" />)).toThrow(
			'react-jsonschema-form-validation: <Probe> must be rendered inside a <Form>, '
			+ 'or receive the form explicitly through its `form` prop.',
		);
		spy.mockRestore();
	});
});
