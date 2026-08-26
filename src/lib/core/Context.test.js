import React from 'react';
import { render } from '@testing-library/react';

import { ajvSchema } from '../providers/ajv';
import FormContext, { useFormContext, useResolvedForm, withFormContext } from './Context';
import Form from './Form';
import useForm from './useForm';

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
