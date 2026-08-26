import { setIn } from './setIn';

describe('setIn(data, path, value)', () => {
	describe('basic writes', () => {
		it('should set a top-level property', () => {
			expect(setIn({ a: 1 }, 'b', 2)).toEqual({ a: 1, b: 2 });
		});

		it('should overwrite an existing property', () => {
			expect(setIn({ a: 1 }, 'a', 2)).toEqual({ a: 2 });
		});

		it('should set a deep property', () => {
			expect(setIn({ user: { email: 'old' } }, 'user.email', 'new@x.fr'))
				.toEqual({ user: { email: 'new@x.fr' } });
		});

		it('should set an empty-string key for an empty path', () => {
			expect(setIn({}, '', 'v')).toEqual({ '': 'v' });
		});
	});

	describe('array indexes', () => {
		it('should set an index of an existing array and keep it an array', () => {
			const result = setIn({ items: ['a', 'b'] }, 'items.1', 'z');
			expect(Array.isArray(result.items)).toBe(true);
			expect(result.items).toEqual(['a', 'z']);
		});

		it('should set a deep property inside an array item', () => {
			const result = setIn({ items: [{ label: 'a' }, { label: 'b' }] }, 'items.0.label', 'z');
			expect(Array.isArray(result.items)).toBe(true);
			expect(result.items).toEqual([{ label: 'z' }, { label: 'b' }]);
		});

		it('should extend the array when the index is out of bounds', () => {
			const result = setIn({ items: ['a'] }, 'items.3', 'z');
			expect(Array.isArray(result.items)).toBe(true);
			expect(result.items.length).toBe(4);
			expect(result.items[3]).toBe('z');
		});

		it('should accept a leading + on an index', () => {
			expect(setIn({ items: ['a', 'b'] }, 'items.+1', 'z')).toEqual({ items: ['a', 'z'] });
		});

		it('should resolve $end to the last index', () => {
			expect(setIn({ items: [1, 2, 3] }, 'items.$end', 9)).toEqual({ items: [1, 2, 9] });
			expect(setIn({ items: [] }, 'items.$end', 9)).toEqual({ items: [9] });
		});

		it('should throw on a non-integer segment applied to an array', () => {
			expect(() => setIn({ items: ['a'] }, 'items.foo', 1))
				.toThrow("Array index 'foo' has to be an integer");
		});
	});

	describe('missing intermediates', () => {
		it('should create missing intermediate objects', () => {
			expect(setIn({}, 'a.b.c', 1)).toEqual({ a: { b: { c: 1 } } });
		});

		it('should create an object with a numeric key (not an array) on an absent target', () => {
			// Documented dot-prop-immutable behavior: arrays are never created,
			// only index-addressed when they already exist.
			const result = setIn({}, 'list.1', 'x');
			expect(Array.isArray(result.list)).toBe(false);
			expect(result.list).toEqual({ 1: 'x' });
		});

		it('should treat an explicit undefined like a missing intermediate', () => {
			expect(setIn({ a: undefined }, 'a.b', 1)).toEqual({ a: { b: 1 } });
		});
	});

	describe('scalar and null intermediates (dot-prop-immutable parity)', () => {
		it('should replace a number or boolean intermediate with an object', () => {
			expect(setIn({ a: 5 }, 'a.b', 1)).toEqual({ a: { b: 1 } });
			expect(setIn({ a: true }, 'a.b', 1)).toEqual({ a: { b: 1 } });
		});

		it('should spread a string intermediate into a char-indexed object', () => {
			expect(setIn({ a: 'hi' }, 'a.b', 1)).toEqual({
				a: {
					0: 'h', 1: 'i', b: 1,
				},
			});
		});

		it('should throw a TypeError on a null intermediate with segments remaining', () => {
			expect(() => setIn({ a: null }, 'a.b', 1)).toThrow(TypeError);
		});

		it('should still allow replacing a null leaf', () => {
			expect(setIn({ a: null }, 'a', 1)).toEqual({ a: 1 });
		});
	});

	describe('structural immutability', () => {
		it('should not mutate the source object', () => {
			const data = { user: { email: 'old' }, other: { k: 1 } };
			setIn(data, 'user.email', 'new');
			expect(data).toEqual({ user: { email: 'old' }, other: { k: 1 } });
		});

		it('should keep untouched siblings identical by reference and renew the written branch', () => {
			const data = {
				user: { email: 'old', address: { city: 'Paris' } },
				sibling: { k: 1 },
				list: [1, 2],
			};
			const result = setIn(data, 'user.email', 'new');

			// New references along the written branch only.
			expect(result).not.toBe(data);
			expect(result.user).not.toBe(data.user);
			// Untouched siblings keep their identity (React.memo contract).
			expect(result.sibling).toBe(data.sibling);
			expect(result.list).toBe(data.list);
			expect(result.user.address).toBe(data.user.address);
		});

		it('should not mutate a source array and keep sibling items identical by reference', () => {
			const data = { items: [{ label: 'a' }, { label: 'b' }] };
			const result = setIn(data, 'items.0.label', 'z');

			expect(data.items[0].label).toBe('a');
			expect(result.items).not.toBe(data.items);
			expect(result.items[0]).not.toBe(data.items[0]);
			expect(result.items[1]).toBe(data.items[1]);
		});
	});

	describe('path grammar', () => {
		it('should honor \\. as an escaped literal dot inside a key', () => {
			expect(setIn({}, 'a\\.b.c', 1)).toEqual({ 'a.b': { c: 1 } });
		});

		it('should treat a leading dot as an empty first segment', () => {
			expect(setIn({}, '.a', 1)).toEqual({ '': { a: 1 } });
		});
	});

	describe('updater function values', () => {
		it('should call a function value with the current value and write its result', () => {
			expect(setIn({ n: 2 }, 'n', (v) => v * 10)).toEqual({ n: 20 });
		});
	});

	describe('dangerous keys (prototype-pollution hardening)', () => {
		afterEach(() => {
			// Safety net: if an implementation regression ever polluted the
			// global prototype, do not let it leak into other tests.
			delete Object.prototype.polluted;
		});

		it('should never pollute Object.prototype via __proto__ paths', () => {
			const result = setIn({}, '__proto__.polluted', true);
			expect({}.polluted).toBeUndefined();
			expect(Object.prototype.polluted).toBeUndefined();
			// The written key is a plain own property, and the result's
			// prototype is untouched (safer than dot-prop-immutable, which
			// rewrote the clone's prototype through the __proto__ setter).
			expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
			expect(Object.getOwnPropertyDescriptor(result, '__proto__').value)
				.toEqual({ polluted: true });
		});

		it('should apply the __proto__ guard at any depth, not only at the root', () => {
			const result = setIn({ user: { name: 'x' } }, 'user.__proto__.polluted', true);

			// No pollution of the global prototype…
			expect({}.polluted).toBeUndefined();
			expect(Object.prototype.polluted).toBeUndefined();
			// …and no pollution of the nested clone either: its prototype is
			// untouched and the value does not leak through the prototype
			// chain — the written key is a plain own property. Without the
			// defineOwn guard, the inherited __proto__ setter would rewrite
			// result.user's prototype and result.user.polluted would be true.
			expect(Object.getPrototypeOf(result.user)).toBe(Object.prototype);
			expect(result.user.polluted).toBeUndefined();
			expect(Object.getOwnPropertyDescriptor(result.user, '__proto__').value)
				.toEqual({ polluted: true });
			expect(result.user.name).toBe('x');
		});

		it('should never pollute prototypes via nested constructor.prototype paths', () => {
			const result = setIn({ user: {} }, 'user.constructor.prototype.polluted', true);

			expect({}.polluted).toBeUndefined();
			expect(Object.prototype.polluted).toBeUndefined();
			// The whole chain is rebuilt from fresh clones: plain own keys,
			// never a write into the real Object.prototype.
			expect(JSON.parse(JSON.stringify(result.user)))
				.toEqual({ constructor: { prototype: { polluted: true } } });
		});

		it('should never pollute prototypes via constructor.prototype paths', () => {
			setIn({}, 'constructor.prototype.polluted', true);
			expect({}.polluted).toBeUndefined();
			expect(Object.prototype.polluted).toBeUndefined();
		});

		it('should keep plain constructor keys working as regular own properties', () => {
			expect(JSON.parse(JSON.stringify(setIn({}, 'constructor.x', 1))))
				.toEqual({ constructor: { x: 1 } });
		});
	});
});
