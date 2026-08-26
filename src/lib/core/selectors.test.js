import {
	selectFieldErrorDescribedBy,
	selectFieldErrors,
	selectIsFieldInvalid,
	selectIsFieldTouched,
	shallowEqual,
} from './selectors';

const error = (field, code = 'type', extra = {}) => ({
	field, code, message: code, params: {}, raw: null, ...extra,
});

const state = (overrides = {}) => ({
	valid: false,
	errors: [error('user.email'), error('user.age', 'min'), error('tags.0'), error('userX')],
	touchedFields: ['user.email', 'tags.0'],
	isSubmitted: false,
	fieldErrorRegistry: [
		{ key: 'k1', name: 'user.email', id: 'f-error-user.email' },
		{ key: 'k2', name: 'user.*', id: 'f-error-user' },
		{ key: 'k3', name: 'user.email', id: 'custom' },
		{ key: 'k4', name: 'other', id: 'f-error-other' },
	],
	errorMessages: undefined,
	...overrides,
});

describe('selectFieldErrors / selectIsFieldInvalid', () => {
	it('should return the errors of one field, of a list, and of a wildcard prefix', () => {
		expect(selectFieldErrors(state(), 'user.email').map((e) => e.field)).toEqual(['user.email']);
		expect(selectFieldErrors(state(), ['nope', 'tags.0', 'user.age']).map((e) => e.field))
			.toEqual(['tags.0', 'user.age']);
		expect(selectFieldErrors(state(), 'user.*').map((e) => e.field)).toEqual(['user.email', 'user.age']);
	});

	it('should treat the dot of a wildcard prefix literally (user.* does not match userX)', () => {
		expect(selectFieldErrors(state(), 'user.*').map((e) => e.field)).not.toContain('userX');
	});

	it('should report invalid when at least one name of the list has an error', () => {
		expect(selectIsFieldInvalid(state(), ['nope', 'tags.0'])).toBe(true);
		expect(selectIsFieldInvalid(state(), ['nope', 'tags.1'])).toBe(false);
		expect(selectIsFieldInvalid(state(), 'user.email')).toBe(true);
	});
});

describe('selectIsFieldTouched', () => {
	it('should match a touched name, any of a list, or a wildcard prefix', () => {
		expect(selectIsFieldTouched(state(), 'user.email')).toBe(true);
		expect(selectIsFieldTouched(state(), 'user.age')).toBe(false);
		expect(selectIsFieldTouched(state(), ['user.age', 'tags.0'])).toBe(true);
		expect(selectIsFieldTouched(state(), 'tags.*')).toBe(true);
		expect(selectIsFieldTouched(state(), 'nope.*')).toBe(false);
	});
});

describe('selectFieldErrorDescribedBy', () => {
	it('should list the registered ids matching the name, in mount order, deduplicated', () => {
		expect(selectFieldErrorDescribedBy(state(), 'user.email')).toBe('f-error-user.email f-error-user custom');
		expect(selectFieldErrorDescribedBy(state(), 'user.age')).toBe('f-error-user');
		const dup = state({
			fieldErrorRegistry: [{ key: 'a', name: 'x', id: 'same' }, { key: 'b', name: 'x', id: 'same' }],
		});
		expect(selectFieldErrorDescribedBy(dup, 'x')).toBe('same');
	});

	it('should return undefined when nothing is registered for the name', () => {
		expect(selectFieldErrorDescribedBy(state(), 'nope')).toBeUndefined();
		expect(selectFieldErrorDescribedBy(state({ fieldErrorRegistry: [] }), 'user.email')).toBeUndefined();
	});
});

describe('shallowEqual', () => {
	it('should compare own keys by reference', () => {
		const shared = {};
		expect(shallowEqual(shared, shared)).toBe(true);
		expect(shallowEqual({ a: 1, b: shared }, { a: 1, b: shared })).toBe(true);
		expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		expect(shallowEqual({ a: {} }, { a: {} })).toBe(false);
		expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
	});
});
