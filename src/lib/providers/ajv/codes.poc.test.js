/**
 * POC criterion 3: real error-code tables — AJV keyword → normalized code,
 * and Zod 4 (through `~standard`) issue code → what the core sees today.
 * Prints markdown tables to the console for the report.
 */
import { z } from 'zod';

import { runSchema } from '../../core/errors';
import { ajvSchema } from '.';

const table = (title, rows) => {
	// eslint-disable-next-line no-console
	console.log(`\n${title}\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`);
};

it('AJV keyword → normalized code', () => {
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
		typ: 'x', min: 1, xmin: 5, max: 9, xmax: 5, minLen: 'a', maxLen: 'abcd', pat: 'b', fmt: 'nope', enm: 'z', cst: 'z', mult: 3, uniq: [1, 1], minI: [1], maxI: [1, 2], one: true, addl: { x: 1 },
	};
	const { errors } = runSchema(ajvSchema(schema), data);
	const rows = [['AJV keyword', 'field', 'code', 'params']];
	errors.forEach((e) => rows.push([e.raw.keyword, e.field, e.code, JSON.stringify(e.params)]));
	table('AJV → FormError', rows);

	const byKeyword = Object.fromEntries(errors.map((e) => [e.raw.keyword, e.code]));
	expect(byKeyword).toMatchObject({
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
		// documented pass-through boundary
		const: 'const',
		multipleOf: 'multipleOf',
		uniqueItems: 'uniqueItems',
		minItems: 'minItems',
		maxItems: 'maxItems',
		oneOf: 'oneOf',
		additionalProperties: 'additionalProperties',
	});
});

it('Zod 4 through ~standard → what the core sees (no zod provider yet)', () => {
	const schema = z.object({
		req: z.string(),
		typ: z.number(),
		min: z.number().min(5),
		max: z.number().max(5),
		minLen: z.string().min(3),
		maxLen: z.string().max(3),
		len: z.string().length(2),
		pat: z.string().regex(/^a/),
		fmt: z.string().email(),
		enm: z.enum(['a']),
		lit: z.literal('a'),
		mult: z.number().multipleOf(2),
		minI: z.array(z.number()).min(2),
		maxI: z.array(z.number()).max(1),
		nested: z.object({ deep: z.string() }),
		union: z.union([z.string(), z.number()]),
	}).strict();
	const data = {
		typ: 'x', min: 1, max: 9, minLen: 'a', maxLen: 'abcd', len: 'abc', pat: 'b', fmt: 'nope', enm: 'z', lit: 'z', mult: 3, minI: [1], maxI: [1, 2], nested: {}, union: true, extra: 1,
	};
	const { errors } = runSchema(schema, data);
	const rows = [['zod code', 'origin/expected', 'field', 'core code', 'message']];
	errors.forEach((e) => rows.push([
		e.raw.code,
		e.raw.origin ?? e.raw.expected ?? e.raw.format ?? '',
		e.field,
		e.code,
		e.message,
	]));
	table('Zod 4 → FormError (pass-through)', rows);

	// The core reads Zod's own `code` (pass-through) and `path`.
	expect(errors.find((e) => e.field === 'req').code).toBe('invalid_type');
	expect(errors.find((e) => e.field === 'min').code).toBe('too_small');
	expect(errors.find((e) => e.field === 'minLen').code).toBe('too_small');
	expect(errors.find((e) => e.field === 'nested.deep').code).toBe('invalid_type');
	expect(errors.find((e) => e.field === 'fmt').code).toBe('invalid_format');
	expect(errors.every((e) => typeof e.raw === 'object' && 'code' in e.raw)).toBe(true);
});
