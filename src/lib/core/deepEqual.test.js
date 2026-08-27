import { clonePlain, deepEqual } from './deepEqual';

describe('deepEqual(a, b)', () => {
	it('should compare primitives with Object.is', () => {
		expect(deepEqual(1, 1)).toBe(true);
		expect(deepEqual('a', 'a')).toBe(true);
		expect(deepEqual(NaN, NaN)).toBe(true);
		expect(deepEqual(0, -0)).toBe(false);
		expect(deepEqual(1, '1')).toBe(false);
		expect(deepEqual(null, undefined)).toBe(false);
		expect(deepEqual(undefined, undefined)).toBe(true);
	});

	it('should compare plain objects recursively, keys in any order, missing ≠ undefined', () => {
		expect(deepEqual({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toBe(true);
		expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
		// Same key count, different keys holding undefined: not equal.
		expect(deepEqual({ a: 1, b: undefined }, { a: 1, c: undefined })).toBe(false);
		expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
		expect(deepEqual({}, {})).toBe(true);
		expect(deepEqual(Object.create(null), {})).toBe(true);
	});

	it('should compare arrays element-wise (length and order matter)', () => {
		expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
		expect(deepEqual([1, 2], [2, 1])).toBe(false);
		expect(deepEqual([1], [1, 2])).toBe(false);
		expect(deepEqual([], {})).toBe(false);
		expect(deepEqual({}, [])).toBe(false);
	});

	it('should compare non-plain objects by reference only', () => {
		const file = new File(['x'], 'a.txt');
		expect(deepEqual(file, file)).toBe(true);
		expect(deepEqual(new File(['x'], 'a.txt'), new File(['x'], 'a.txt'))).toBe(false);
		expect(deepEqual(new Date(0), new Date(0))).toBe(false);
		class Thing { constructor() { this.a = 1; } }
		expect(deepEqual(new Thing(), new Thing())).toBe(false);
		expect(deepEqual({ a: 1 }, new Thing())).toBe(false);
		expect(deepEqual(() => {}, () => {})).toBe(false);
		expect(deepEqual({ f: file }, { f: file })).toBe(true);
	});

	it('should tell two normalized errors apart by params or raw.data', () => {
		const base = {
			field: 'a', code: 'minLength', message: 'm', params: { limit: 3 }, raw: { data: 'a' },
		};
		expect(deepEqual(base, { ...base, raw: { data: 'a' } })).toBe(true);
		expect(deepEqual(base, { ...base, raw: { data: 'ab' } })).toBe(false);
		expect(deepEqual(base, { ...base, params: { limit: 4 } })).toBe(false);
		expect(deepEqual(
			{ ...base, params: { passingSchemas: [0, 1] } },
			{ ...base, params: { passingSchemas: [0, 2] } },
		)).toBe(false);
	});
});

describe('clonePlain', () => {
	it('copies plain objects and arrays recursively, keeps everything else by reference', () => {
		const file = new File(['x'], 'x.txt');
		const date = new Date(0);
		const source = {
			list: [1, { deep: 'a' }], nested: { file, date }, n: 1, s: 's', nil: null,
		};
		const copy = clonePlain(source);
		expect(copy).toEqual(source);
		expect(copy).not.toBe(source);
		expect(copy.list).not.toBe(source.list);
		expect(copy.list[1]).not.toBe(source.list[1]);
		expect(copy.nested).not.toBe(source.nested);
		expect(copy.nested.file).toBe(file);
		expect(copy.nested.date).toBe(date);
		expect(clonePlain(3)).toBe(3);
		expect(clonePlain(undefined)).toBe(undefined);
		// A later in-place mutation of the source is not visible in the copy.
		source.list[1].deep = 'b';
		expect(copy.list[1].deep).toBe('a');
	});
});
