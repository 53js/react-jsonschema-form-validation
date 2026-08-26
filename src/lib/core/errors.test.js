import { z } from 'zod';

import {
	assertSyncResult,
	normalizeIssues,
	pathToField,
	runSchema,
} from './errors';
import { isStandardSchema } from './standard-schema';

describe('pathToField(path)', () => {
	it('should map a missing or empty path to the root field ""', () => {
		expect(pathToField(undefined)).toBe('');
		expect(pathToField([])).toBe('');
	});

	it('should join property keys and array indexes with dots', () => {
		expect(pathToField(['items', 0, 'label'])).toBe('items.0.label');
	});

	it('should unwrap { key } segments (the spec escape hatch)', () => {
		expect(pathToField([{ key: 'user' }, { key: 2 }, 'email'])).toBe('user.2.email');
	});
});

describe('normalizeIssues(issues)', () => {
	it('should map a provider issue to the FormError shape', () => {
		const raw = { keyword: 'minLength' };
		const [error] = normalizeIssues([{
			message: 'too short',
			path: ['user', 'name'],
			code: 'minLength',
			params: { limit: 3 },
			raw,
		}]);
		expect(error).toEqual({
			field: 'user.name',
			code: 'minLength',
			message: 'too short',
			params: { limit: 3 },
			raw,
		});
		expect(error.raw).toBe(raw);
	});

	it('should fall back to code "unknown" when the issue carries no string code', () => {
		expect(normalizeIssues([{ message: 'x' }])[0].code).toBe('unknown');
		expect(normalizeIssues([{ message: 'x', code: 42 }])[0].code).toBe('unknown');
	});

	it('should default params to an empty object when absent or not an object', () => {
		expect(normalizeIssues([{ message: 'x' }])[0].params).toEqual({});
		expect(normalizeIssues([{ message: 'x', params: null }])[0].params).toEqual({});
		expect(normalizeIssues([{ message: 'x', params: 'nope' }])[0].params).toEqual({});
	});

	it('should use the issue itself as raw when the provider gives none', () => {
		const issue = { message: 'x', path: ['a'] };
		expect(normalizeIssues([issue])[0].raw).toBe(issue);
	});
});

describe('assertSyncResult(result)', () => {
	it('should return a synchronous result untouched', () => {
		const result = { value: { a: 1 } };
		expect(assertSyncResult(result)).toBe(result);
	});

	it('should throw an explicit error on a Promise (sync-only in v1)', () => {
		expect(() => assertSyncResult(Promise.resolve({ value: 1 }))).toThrow(
			'react-jsonschema-form-validation: the schema returned a Promise from validate(). '
			+ 'Async validation is not supported (sync-only in v1).',
		);
	});

	it('should treat any thenable as async', () => {
		expect(() => assertSyncResult({ then: () => {} })).toThrow(/Async validation is not supported/);
	});
});

describe('runSchema(schema, data)', () => {
	const schemaOf = (validate) => ({ '~standard': { version: 1, vendor: 'test', validate } });

	it('should report valid with no errors on a successful result', () => {
		expect(runSchema(schemaOf(() => ({ value: 1 })), 1)).toEqual({ valid: true, errors: [] });
	});

	it('should treat an empty issue list as valid', () => {
		expect(runSchema(schemaOf(() => ({ issues: [] })), 1)).toEqual({ valid: true, errors: [] });
	});

	it('should pass the data to validate() and normalize the issues', () => {
		const validate = vi.fn(() => ({ issues: [{ message: 'bad', path: ['a'], code: 'type' }] }));
		const result = runSchema(schemaOf(validate), { a: 1 });
		expect(validate).toHaveBeenCalledWith({ a: 1 });
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]).toMatchObject({ field: 'a', code: 'type', message: 'bad' });
	});

	it('should throw on an async schema', () => {
		expect(() => runSchema(schemaOf(async () => ({ value: 1 })), 1)).toThrow(/sync-only/);
	});
});

describe('Zod 4 through ~standard (real third-party Standard Schema)', () => {
	const schema = z.object({
		req: z.string(),
		min: z.number().min(5),
		max: z.number().max(5),
		minLen: z.string().min(3),
		fmt: z.string().email(),
		enm: z.enum(['a']),
		nested: z.object({ deep: z.string() }),
		list: z.array(z.object({ label: z.string().min(2) })),
	});
	const data = {
		min: 1, max: 9, minLen: 'a', fmt: 'nope', enm: 'z', nested: {}, list: [{ label: 'ok' }, { label: 'x' }],
	};

	it('should be detected by isStandardSchema', () => {
		expect(isStandardSchema(schema)).toBe(true);
		expect(isStandardSchema({})).toBe(false);
		expect(isStandardSchema(null)).toBe(false);
		expect(isStandardSchema(42)).toBe(false);
		expect(isStandardSchema({ '~standard': { validate: 'nope' } })).toBe(false);
	});

	it('should accept a callable schema carrying ~standard (ArkType-style Type)', () => {
		const callable = () => {};
		callable['~standard'] = { version: 1, vendor: 'arktype', validate: () => ({ value: 1 }) };
		expect(isStandardSchema(callable)).toBe(true);
		expect(runSchema(callable, 1)).toEqual({ valid: true, errors: [] });
		expect(isStandardSchema(() => {})).toBe(false);
	});

	it('should pass Zod codes through unchanged (no zod provider yet) with dot-path fields', () => {
		const { valid, errors } = runSchema(schema, data);
		expect(valid).toBe(false);
		const codes = Object.fromEntries(errors.map((e) => [e.field, e.code]));
		expect(codes).toEqual({
			req: 'invalid_type',
			min: 'too_small',
			max: 'too_big',
			minLen: 'too_small',
			fmt: 'invalid_format',
			enm: 'invalid_value',
			'nested.deep': 'invalid_type',
			'list.1.label': 'too_small',
		});
	});

	it('should keep the Zod issue as raw, with empty params and the Zod message', () => {
		const { errors } = runSchema(schema, data);
		const minError = errors.find((e) => e.field === 'min');
		expect(minError.raw).toMatchObject({ code: 'too_small', origin: 'number', minimum: 5 });
		expect(minError.params).toEqual({});
		// Zod's own wording is not ours to lock: the message must be the
		// provider's, verbatim.
		expect(minError.message).toBe(minError.raw.message);
		expect(minError.message).not.toBe('');
	});

	it('should report valid on conforming data', () => {
		expect(runSchema(schema, {
			req: 'x', min: 5, max: 5, minLen: 'abc', fmt: 'a@b.co', enm: 'a', nested: { deep: 'd' }, list: [],
		})).toEqual({ valid: true, errors: [] });
	});
});
