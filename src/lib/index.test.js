import Ajv2020 from 'ajv/dist/2020';
import React from 'react';
import { render } from '@testing-library/react';

import * as root from '.';
import * as core from './core';
import { ajvSchema } from './providers/ajv';

const jsonSchema = {
	type: 'object',
	properties: { type: { type: 'string', enum: ['te', 'ta'] } },
	required: ['type'],
};

const {
	Form, useForm, useFormContext, Field, FieldError,
} = root;

const Capture = ({ onForm }) => { onForm(useFormContext()); return null; };

describe('root entry', () => {
	it('should re-export the core surface but not the AJV provider', () => {
		expect(root.Field).toBe(core.Field);
		expect(root.FieldError).toBe(core.FieldError);
		expect(root.FormContext).toBe(core.FormContext);
		expect(root.useFormContext).toBe(core.useFormContext);
		expect(root.useFormSelector).toBe(core.useFormSelector);
		expect(root.getFieldErrorId).toBe(core.getFieldErrorId);
		expect(root.default).toBe(root.Form);
		expect(root.Form).not.toBe(core.Form);
		expect(root.useForm).not.toBe(core.useForm);
		expect(root.ajvSchema).toBeUndefined();
		expect(root.createAjv).toBeUndefined();
	});
});

describe('sugar useForm / <Form> (plain JSON Schema)', () => {
	it('should wrap a plain JSON Schema with the AJV provider, once per schema identity', () => {
		const compile = vi.fn(() => {
			const validate = () => true;
			validate.errors = null;
			return validate;
		});
		const ajv = { compile };
		let api;
		const Harness = ({ schema, data }) => {
			api = useForm({ schema, data, ajv });
			return <Form form={api} onSubmit={() => {}} />;
		};
		const { rerender } = render(<Harness schema={jsonSchema} data={{ type: 'te' }} />);
		expect(compile).toHaveBeenCalledTimes(1);
		expect(compile).toHaveBeenCalledWith(jsonSchema);
		rerender(<Harness schema={jsonSchema} data={{ type: 'ta' }} />);
		expect(compile).toHaveBeenCalledTimes(1);
		const other = { ...jsonSchema };
		rerender(<Harness schema={other} data={{ type: 'ta' }} />);
		expect(compile).toHaveBeenCalledTimes(2);
		expect(api.valid).toBe(true);
	});

	it('should pass a Standard Schema object through untouched', () => {
		const standard = ajvSchema(jsonSchema);
		let api;
		const Harness = () => {
			api = useForm({ schema: standard, data: { type: 'nope' } });
			return <Form form={api} onSubmit={() => {}} />;
		};
		render(<Harness />);
		expect(api.errors.map((e) => e.code)).toEqual(['enum']);
	});

	it('<Form schema={json}> validates through the default AJV instance (formats, $data)', () => {
		let form;
		render(
			<Form
				data={{ email: 'nope', password: 'a', confirm: 'b' }}
				onSubmit={() => {}}
				schema={{
					type: 'object',
					properties: {
						email: { type: 'string', format: 'email' },
						password: { type: 'string' },
						confirm: { type: 'string', const: { $data: '1/password' } },
					},
				}}
			>
				<Capture onForm={(f) => { form = f; }} />
				<Field name="email" />
				<FieldError name="email" />
			</Form>,
		);
		expect(form.errors.map((e) => [e.field, e.code])).toEqual([['email', 'format'], ['confirm', 'const']]);
	});

	it('<Form ajv={instance}> uses the given instance (draft 2020-12) and rejects a broken one', () => {
		let form;
		render(
			<Form
				ajv={new Ajv2020({ allErrors: true })}
				data={[1, 'x']}
				onSubmit={() => {}}
				schema={{ type: 'array', prefixItems: [{ type: 'number' }], items: false }}
			>
				<Capture onForm={(f) => { form = f; }} />
			</Form>,
		);
		expect(form.valid).toBe(false);
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => render(<Form ajv={42} onSubmit={() => {}} schema={{}} />)).toThrow(/compile\(schema\) function, received number/);
		spy.mockRestore();
	});

	it('hook mode through the root <Form> ignores schema/ajv props (they belong to useForm)', () => {
		let api;
		const Harness = () => {
			api = useForm({ schema: jsonSchema, data: { type: 'te' }, id: 'h' });
			return <Form form={api} onSubmit={() => {}}><Field name="type" /></Form>;
		};
		const { container } = render(<Harness />);
		expect(container.querySelector('form').id).toBe('h');
		expect(api.valid).toBe(true);
	});
});
