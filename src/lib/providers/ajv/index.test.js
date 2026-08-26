import Ajv2020 from 'ajv/dist/2020';

import { runSchema, SYNC_ONLY_ERROR_MESSAGE } from '../../core/errors';
import { isStandardSchema } from '../../core/standard-schema';
import { createAjv as createAjvFromHelpers } from './helpers';
import { ajvSchema, createAjv } from '.';

const run = (schema, data, options) => runSchema(ajvSchema(schema, options), data);
const codesByKeyword = (errors) => Object.fromEntries(errors.map((e) => [e.raw.keyword, e.code]));

// A compile-capable stub whose validator always fails with the given raw
// AJV-shaped errors — lets the tests feed hand-crafted error objects
// (legacy AJV 6 shape, edge cases) through the public `ajvSchema()` path.
const stubAjv = (errors) => ({
	compile: () => {
		const validate = () => false;
		validate.errors = errors;
		return validate;
	},
});

describe('ajvSchema(schema, { ajv })', () => {
	it('should return a Standard Schema object backed by AJV, keeping the JSON Schema', () => {
		const jsonSchema = { type: 'object' };
		const schema = ajvSchema(jsonSchema);
		expect(isStandardSchema(schema)).toBe(true);
		expect(schema['~standard'].version).toBe(1);
		expect(schema['~standard'].vendor).toBe('ajv');
		expect(schema.jsonSchema).toBe(jsonSchema);
	});

	it('should re-export createAjv from the subpath (same function as the helpers)', () => {
		expect(createAjv).toBe(createAjvFromHelpers);
	});

	it('should throw a clear error when ajv does not expose compile()', () => {
		expect(() => ajvSchema({}, { ajv: 42 })).toThrow(
			'react-jsonschema-form-validation: `ajv` must be an AJV-like instance exposing '
			+ 'a compile(schema) function, received number.',
		);
		expect(() => ajvSchema({}, { ajv: { notCompile: true } })).toThrow(/received object\./);
		// `null` / `undefined` mean "not provided": the default instance is used
		// (same leniency as the 0.x `ajv` prop).
		expect(() => ajvSchema({}, { ajv: null })).not.toThrow();
		expect(() => ajvSchema({}, { ajv: undefined })).not.toThrow();
	});

	it('should accept any compile-capable object and use it', () => {
		const compile = vi.fn(() => () => true);
		const schema = ajvSchema({ type: 'string' }, { ajv: { compile } });
		expect(compile).toHaveBeenCalledWith({ type: 'string' });
		expect(schema['~standard'].validate('x')).toEqual({ value: 'x' });
	});

	it('should work with a real draft 2020-12 Ajv instance', () => {
		const ajv = new Ajv2020({ allErrors: true });
		const schema = { type: 'array', prefixItems: [{ type: 'number' }], items: false };
		expect(run(schema, [1], { ajv })).toEqual({ valid: true, errors: [] });
		const { valid, errors } = run(schema, [1, 'extra'], { ajv });
		expect(valid).toBe(false);
		expect(errors.map((e) => [e.field, e.code])).toEqual([['', 'items']]);
	});
});

describe('validate(data) — value normalization', () => {
	const schema = {
		type: 'object',
		properties: { email: { type: 'string' }, age: { type: 'number' } },
		required: ['email', 'age'],
	};

	it('should return the formatted value on success', () => {
		const result = ajvSchema({ type: 'object' })['~standard'].validate({ a: '', b: null, c: 'x' });
		expect(result).toEqual({ value: { a: undefined, b: undefined, c: 'x' } });
	});

	it('should treat empty strings and null as missing for `required` (formatData)', () => {
		const { valid, errors } = run(schema, { email: '', age: null });
		expect(valid).toBe(false);
		expect(errors.map((e) => [e.field, e.code])).toEqual([
			['email', 'required'],
			['age', 'required'],
		]);
	});

	it('should not mutate the input data', () => {
		const data = { email: '', age: 1 };
		run(schema, data);
		expect(data).toEqual({ email: '', age: 1 });
	});
});

describe('validate(data) — sync-only', () => {
	it('should throw the sync-only error on an $async schema and not leak a rejection', async () => {
		const unhandled = vi.fn();
		process.on('unhandledRejection', unhandled);
		try {
			// `$async: true` makes AJV return a Promise (rejected on invalid data).
			const schema = ajvSchema({
				$async: true,
				type: 'object',
				properties: { a: { type: 'number' } },
			});
			expect(() => schema['~standard'].validate({ a: 'not a number' })).toThrow(SYNC_ONLY_ERROR_MESSAGE);
			expect(() => schema['~standard'].validate({ a: 1 })).toThrow(SYNC_ONLY_ERROR_MESSAGE);
			// Let the rejected promise settle: the handler attached by the guard
			// must have consumed the rejection.
			await new Promise((resolve) => { setTimeout(resolve, 0); });
			expect(unhandled).not.toHaveBeenCalled();
		} finally {
			process.off('unhandledRejection', unhandled);
		}
	});

	it('should throw the sync-only error when the validator returns a non-boolean', () => {
		const ajv = { compile: () => () => 'yes' };
		expect(() => ajvSchema({}, { ajv })['~standard'].validate({})).toThrow(SYNC_ONLY_ERROR_MESSAGE);
	});
});

describe('error normalization — keyword → code', () => {
	const schema = {
		type: 'object',
		properties: {
			req: { type: 'string' },
			typ: { type: 'number' },
			min: { type: 'number', minimum: 5 },
			xmin: { type: 'number', exclusiveMinimum: 5 },
			max: { type: 'number', maximum: 5 },
			xmax: { type: 'number', exclusiveMaximum: 5 },
			minLen: { type: 'string', minLength: 3 },
			maxLen: { type: 'string', maxLength: 3 },
			pat: { type: 'string', pattern: '^a' },
			fmt: { type: 'string', format: 'email' },
			enm: { type: 'string', enum: ['a'] },
			cst: { type: 'string', const: 'a' },
			mult: { type: 'number', multipleOf: 2 },
			uniq: { type: 'array', uniqueItems: true },
			minI: { type: 'array', minItems: 2 },
			maxI: { type: 'array', maxItems: 1 },
			one: { oneOf: [{ type: 'string' }, { type: 'number' }] },
			addl: { type: 'object', additionalProperties: false },
		},
		required: ['req'],
	};
	const data = {
		typ: 'x',
		min: 1,
		xmin: 5,
		max: 9,
		xmax: 5,
		minLen: 'a',
		maxLen: 'abcd',
		pat: 'b',
		fmt: 'nope',
		enm: 'z',
		cst: 'z',
		mult: 3,
		uniq: [1, 1],
		minI: [1],
		maxI: [1, 2],
		one: true,
		addl: { x: 1 },
	};

	it('should map the 9 core codes and pass every other keyword through', () => {
		const { errors } = run(schema, data);
		expect(codesByKeyword(errors)).toEqual({
			required: 'required',
			type: 'type',
			minimum: 'min',
			exclusiveMinimum: 'min',
			maximum: 'max',
			exclusiveMaximum: 'max',
			minLength: 'minLength',
			maxLength: 'maxLength',
			pattern: 'pattern',
			format: 'format',
			enum: 'enum',
			const: 'const',
			multipleOf: 'multipleOf',
			uniqueItems: 'uniqueItems',
			minItems: 'minItems',
			maxItems: 'maxItems',
			oneOf: 'oneOf',
			additionalProperties: 'additionalProperties',
		});
	});

	it('should expose the AJV params, message and the verbose error as raw', () => {
		const { errors } = run(schema, data);
		const byField = Object.fromEntries(errors.map((e) => [e.field, e]));
		expect(byField.min.params).toEqual({ comparison: '>=', limit: 5 });
		expect(byField.min.message).toBe(byField.min.raw.message);
		expect(byField.min.message).not.toBe('');
		expect(byField.req.params).toEqual({ missingProperty: 'req' });
		expect(byField.enm.params).toEqual({ allowedValues: ['a'] });
		expect(byField.min.raw).toMatchObject({ keyword: 'minimum', instancePath: '/min' });
	});

	it('should carry the current field value as raw.data (verbose mode, issue #6)', () => {
		const { errors } = run(schema, data);
		const byField = Object.fromEntries(errors.map((e) => [e.field, e]));
		expect(byField.minLen.raw.data).toBe('a');
		expect(byField.fmt.raw.data).toBe('nope');
		// `required` is reported on the parent: raw.data is the parent object.
		expect(byField.req.raw.data).toMatchObject({ typ: 'x' });
	});

	it('should keep the raw AJV error object by reference (no copy)', () => {
		const rawError = {
			keyword: 'maximum', instancePath: '/n', params: { limit: 1 }, message: 'too big',
		};
		const { errors } = run({}, {}, { ajv: stubAjv([rawError]) });
		expect(errors).toEqual([{
			field: 'n', code: 'max', message: 'too big', params: { limit: 1 }, raw: rawError,
		}]);
		expect(errors[0].raw).toBe(rawError);
	});
});

describe('error normalization — field paths', () => {
	it('should point required errors at the missing property, at the root and nested', () => {
		const schema = {
			type: 'object',
			properties: {
				user: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
			},
			required: ['user', 'other'],
		};
		expect(run(schema, {}).errors.map((e) => e.field)).toEqual(['user', 'other']);
		expect(run(schema, { user: {}, other: 1 }).errors.map((e) => e.field)).toEqual(['user.email']);
	});

	it('should convert multi-index array pointers to dotted paths', () => {
		const schema = {
			type: 'array',
			items: {
				type: 'object',
				properties: { tags: { type: 'array', items: { type: 'string', minLength: 2 } } },
				required: ['tags'],
			},
		};
		const { errors } = run(schema, [{ tags: ['ok', 'x'] }, {}]);
		expect(errors.map((e) => [e.field, e.code])).toEqual([
			['0.tags.1', 'minLength'],
			['1.tags', 'required'],
		]);
	});

	it('should decode RFC 6901 escapes in pointer segments', () => {
		const schema = {
			type: 'object',
			properties: { 'a/b': { type: 'number' }, 'c~d': { type: 'number' } },
		};
		const { errors } = run(schema, { 'a/b': 'x', 'c~d': 'x' });
		expect(errors.map((e) => e.field)).toEqual(['a/b', 'c~d']);
	});

	it('should map a root-level error to the empty field', () => {
		expect(run({ type: 'object' }, 42).errors.map((e) => [e.field, e.code])).toEqual([['', 'type']]);
	});

	it('should append missingProperty only for required errors', () => {
		const { errors } = run({}, {}, {
			ajv: stubAjv([
				{ keyword: 'required', instancePath: '/a', params: { missingProperty: 'b' } },
				{ keyword: 'required', instancePath: '', params: { missingProperty: 'b' } },
				{ keyword: 'required', instancePath: '/a', params: {} },
				{ keyword: 'type', instancePath: '/a', params: { missingProperty: 'b' } },
			]),
		});
		expect(errors.map((e) => e.field)).toEqual(['a.b', 'b', 'a', 'a']);
	});
});

describe('legacy AJV 6 error shape (dataPath fallback)', () => {
	it('should read dataPath (dot/bracket notation) when instancePath is absent', () => {
		const { errors } = run({}, {}, {
			ajv: stubAjv([
				{
					keyword: 'minLength', dataPath: '.items[0].label', params: { limit: 2 }, message: 'short',
				},
				{
					keyword: 'required', dataPath: '.user', params: { missingProperty: 'email' }, message: 'missing',
				},
				{ keyword: 'type', params: { type: 'object' }, message: 'root' },
			]),
		});
		expect(errors.map((e) => [e.field, e.code])).toEqual([
			['items.0.label', 'minLength'],
			['user.email', 'required'],
			['', 'type'],
		]);
	});

	it('should default the message to an empty string when the error has none', () => {
		const { errors } = run({}, {}, { ajv: stubAjv([{ keyword: 'type', params: {} }]) });
		expect(errors[0].message).toBe('');
	});
});

describe('default instance — $data and ajv-formats end-to-end', () => {
	it('should resolve $data references (password confirmation)', () => {
		const schema = {
			type: 'object',
			properties: {
				password: { type: 'string' },
				confirm: { type: 'string', const: { $data: '1/password' } },
			},
		};
		expect(run(schema, { password: 's3cret', confirm: 's3cret' }).valid).toBe(true);
		const { errors } = run(schema, { password: 's3cret', confirm: 'nope' });
		expect(errors.map((e) => [e.field, e.code])).toEqual([['confirm', 'const']]);
		expect(errors[0].raw.data).toBe('nope');
	});

	it('should validate string formats through ajv-formats', () => {
		const schema = { type: 'object', properties: { email: { type: 'string', format: 'email' } } };
		expect(run(schema, { email: 'hugo@53js.fr' }).valid).toBe(true);
		expect(run(schema, { email: 'nope' }).errors.map((e) => [e.field, e.code])).toEqual([['email', 'format']]);
	});

	it('should tolerate unknown keywords (strict mode disabled on the default instance)', () => {
		expect(() => ajvSchema({ type: 'string', notAKeyword: true })).not.toThrow();
	});
});

describe('defensive branches', () => {
	it('should report no issue when a failing validator exposes no errors array', () => {
		// AJV always fills `errors` on failure; a custom compile-capable
		// object might not. Treated as "no reported problem" rather than crashing.
		expect(ajvSchema({}, { ajv: stubAjv(null) })['~standard'].validate({})).toEqual({ issues: [] });
	});
});
