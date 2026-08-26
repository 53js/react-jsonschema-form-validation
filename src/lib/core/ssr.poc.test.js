/**
 * POC criterion 7: SSR compatibility — `renderToString` of both modes must
 * not throw (every `useSyncExternalStore` call passes `getServerSnapshot`),
 * must not touch `document` / `window` during render, and must emit the
 * `useId`-derived `id` / `form` attributes. The first validation runs on the
 * server (store created eagerly in a `useState` initializer), so the markup
 * already reflects `valid` / `errors` — deterministic on both sides.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';

import {
	Form, Field, FieldError, useForm,
} from '..';

const schema = {
	type: 'object',
	properties: {
		email: { type: 'string', format: 'email' },
		age: { type: 'number', minimum: 18 },
	},
	required: ['email'],
};
const invalidData = { email: 'nope', age: 3 };

// Any property access on `document` / `window` during render throws — the
// jsdom globals are swapped for tripwires for the duration of the call
// (`global` rather than `globalThis`: ESLint 6's env predates ES2020).
const withoutDom = (fn) => {
	const saved = { document: global.document, window: global.window };
	const trap = (name) => new Proxy({}, {
		// Concatenation: a template starting with `${` crashes ESLint 6 (see vite.lib.config.js).
		get: (_, prop) => { throw new Error(name.concat('.', String(prop), ' accessed during SSR render')); },
	});
	Object.defineProperty(global, 'document', { value: trap('document'), configurable: true });
	Object.defineProperty(global, 'window', { value: trap('window'), configurable: true });
	try {
		return fn();
	} finally {
		Object.defineProperty(global, 'document', { value: saved.document, configurable: true });
		Object.defineProperty(global, 'window', { value: saved.window, configurable: true });
	}
};

const attr = (html, name) => {
	const match = html.match(new RegExp(`${name}="([^"]*)"`));
	return match ? match[1] : undefined;
};

it('(a) renders a sugar-mode form on the server with the first validation applied', () => {
	const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	const html = withoutDom(() => renderToString(
		<Form data={invalidData} onSubmit={() => {}} schema={schema}>
			<Field name="email" />
			<FieldError name="email" />
			<Field name="age" type="number" />
			<FieldError name="age" />
		</Form>,
	));
	// No React warning at all (in particular no "Missing getServerSnapshot").
	expect(errorSpy).not.toHaveBeenCalled();
	errorSpy.mockRestore();

	const formId = attr(html, 'id');
	expect(formId).toMatch(/^:R.*:$|^«R.*»$/); // React 18 `:R…:` / React 19 `«R…»` server ids
	expect(html).toContain(`<form id="${formId}" class="Jfv_Form" novalidate=""`);
	expect(html.match(/form="([^"]*)"/g)).toEqual([`form="${formId}"`, `form="${formId}"`]);
	// Errors are already known on the server: both <FieldError> render.
	expect(html).toContain(`id="${formId}-error-email" role="alert"`);
	expect(html).toContain(`id="${formId}-error-age" role="alert"`);
	expect(html).toContain('must match format &quot;email&quot;');
	expect(html).toContain('must be &gt;= 18');
	// Not revealed yet (untouched, unsubmitted): no aria-invalid / describedby.
	expect(html).not.toContain('aria-invalid');
	expect(html).not.toContain('aria-describedby');
});

it('(b) renders a hook-mode form on the server, form.valid already computed', () => {
	const Page = () => {
		const form = useForm({ schema, data: invalidData });
		return (
			<Form form={form} onSubmit={() => {}}>
				<Field name="email" />
				<FieldError name="email" />
				<Field name="age" type="number" />
				<FieldError name="age" />
				<button type="submit" disabled={!form.valid}>Save</button>
				<output name="count">{form.errors.length}</output>
			</Form>
		);
	};
	const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	const html = withoutDom(() => renderToString(<Page />));
	expect(errorSpy).not.toHaveBeenCalled();
	errorSpy.mockRestore();

	const formId = attr(html, 'id');
	expect(html).toContain(`<form id="${formId}"`);
	expect(html.match(/form="([^"]*)"/g)).toEqual([`form="${formId}"`, `form="${formId}"`]);
	// The parent read `form.valid` / `form.errors` during the server render.
	expect(html).toContain('<button type="submit" disabled="">Save</button>');
	expect(html).toContain('<output name="count">2</output>');
});

it('(c) a user-supplied id is rendered verbatim on the server (stable across hydration)', () => {
	const html = withoutDom(() => renderToString(
		<Form id="checkout" data={invalidData} onSubmit={() => {}} schema={schema}>
			<Field name="email" />
			<FieldError name="email" />
		</Form>,
	));
	expect(html).toContain('<form id="checkout"');
	expect(html).toContain('form="checkout"');
	expect(html).toContain('id="checkout-error-email"');
});
