import Ajv from 'ajv';

import * as helpers from './helpers';

describe('.createAjv()', () => {
	it('should return an Ajv instance', () => {
		const ajv = helpers.createAjv();
		expect(ajv).toBeInstanceOf(Ajv);
	});

	it('should compile and validate string formats (ajv-formats)', () => {
		// AJV 8 moved formats out of the core package: without the
		// `addFormats(ajv)` call in createAjv, `format: 'email'` would be
		// silently ignored (strict: false) and every value would pass.
		const ajv = helpers.createAjv();
		const validate = ajv.compile({ type: 'string', format: 'email' });
		expect(validate('hugo@53js.fr')).toBe(true);
		expect(validate('not-an-email')).toBe(false);
	});

	it('should resolve $data references', () => {
		// Password-confirmation pattern: `confirm` must equal the sibling
		// `password` value. Requires the `$data: true` option.
		const ajv = helpers.createAjv();
		const validate = ajv.compile({
			type: 'object',
			properties: {
				password: { type: 'string' },
				confirm: { type: 'string', const: { $data: '1/password' } },
			},
		});
		expect(validate({ password: 's3cret', confirm: 's3cret' })).toBe(true);
		expect(validate({ password: 's3cret', confirm: 'nope' })).toBe(false);
	});

	it('should tolerate unknown keywords (strict mode disabled)', () => {
		// AJV 8 defaults to strict mode, which throws on unknown keywords at
		// compile time. createAjv keeps AJV 6's permissive behavior.
		const ajv = helpers.createAjv();
		expect(() => ajv.compile({
			type: 'object',
			someUnknownKeyword: true,
		})).not.toThrow();
	});

	// Issue #6: `verbose: true` makes AJV attach the offending value to each
	// error as `error.data`, so `errorMessages` callbacks can interpolate it.
	describe('verbose errors (issue #6)', () => {
		const schema = {
			type: 'object',
			properties: {
				name: { type: 'string', minLength: 5 },
			},
			required: ['name', 'age'],
		};

		it('should attach the current field value as `data` on value-level errors (minLength)', () => {
			const ajv = helpers.createAjv();
			const validate = ajv.compile(schema);
			validate({ name: 'abc' });

			const minLengthError = validate.errors.find((e) => e.keyword === 'minLength');
			expect(minLengthError.data).toBe('abc');
			// `schema` is the failing keyword's value, `parentSchema` the
			// enclosing subschema.
			expect(minLengthError.schema).toBe(5);
			expect(minLengthError.parentSchema).toEqual({ type: 'string', minLength: 5 });
		});

		it('should attach the parent object as `data` on required errors (the missing value itself does not exist)', () => {
			const ajv = helpers.createAjv();
			const validate = ajv.compile(schema);
			const formData = { name: 'valid name' };
			validate(formData);

			const requiredError = validate.errors.find((e) => e.keyword === 'required');
			expect(requiredError.params.missingProperty).toBe('age');
			// AJV reports `required` on the parent object: `data` is that
			// object, not the (nonexistent) missing value.
			expect(requiredError.data).toBe(formData);
		});

		it('should attach the current field value as `data` on $data-reference errors', () => {
			const ajv = helpers.createAjv();
			const validate = ajv.compile({
				type: 'object',
				properties: {
					email: { type: 'string' },
					emailConfirm: { const: { $data: '1/email' } },
				},
			});
			validate({ email: 'a@b.fr', emailConfirm: 'oops' });

			const constError = validate.errors.find((e) => e.keyword === 'const');
			// `data` is the value of the field under validation; `schema`
			// stays the raw (unresolved) $data reference.
			expect(constError.data).toBe('oops');
			expect(constError.schema).toEqual({ $data: '1/email' });
		});

		it('should keep `data` available after formatErrors()', () => {
			const ajv = helpers.createAjv();
			const validate = ajv.compile(schema);
			validate({ name: 'abc' });

			const errors = helpers.formatErrors(validate.errors);
			const minLengthError = errors.find((e) => e.keyword === 'minLength');
			expect(minLengthError.field).toBe('name');
			expect(minLengthError.data).toBe('abc');
		});
	});
});

describe('.empty(value)', () => {
	it('should return undefined if value is undefined, null or an empty string', () => {
		expect(helpers.empty(undefined)).toBeUndefined();
		expect(helpers.empty(null)).toBeUndefined();
		expect(helpers.empty('')).toBeUndefined();
	});
});

describe('.formatData(data)', () => {
	it('should call .empty() deeply for every values of the data object', () => {
		const data = {
			empt: '',
			arr: [],
			nest: {
				val: '',
				arr: [
					{
						val: null,
					},
				],
			},
		};

		expect(helpers.formatData(data)).toEqual({
			empt: undefined,
			arr: [],
			nest: {
				val: undefined,
				arr: [
					{
						val: undefined,
					},
				],
			},
		});
	});
});

describe('.formatErrors(errors)', () => {
	it('should return an empty list for null or undefined (AJV leaves errors null on success)', () => {
		expect(helpers.formatErrors(null)).toEqual([]);
		expect(helpers.formatErrors(undefined)).toEqual([]);
	});

	it('should add a property field to each errors', () => {
		const errors = [{ dataPath: 'input' }];
		expect(helpers.formatErrors(errors)[0]).toHaveProperty('field');
	});

	it('should add a property field for required errors', () => {
		let errors = [{
			dataPath: 'nested',
			keyword: 'required',
			params: {
				missingProperty: 'input',
			},
		}];

		expect(helpers.formatErrors(errors)[0].field).toStrictEqual('nested.input');

		errors = [{
			dataPath: '',
			keyword: 'required',
			params: {
				missingProperty: 'input',
			},
		}];

		expect(helpers.formatErrors(errors)[0].field).toStrictEqual('input');
	});

	it('should array bracket notation to dot notation', () => {
		const errors = [{ dataPath: 'arr[0].input' }];
		expect(helpers.formatErrors(errors)[0].field).toStrictEqual('arr.0.input');
	});

	it('should convert every array index when the path contains several', () => {
		const errors = [{ dataPath: 'items[0].tags[1]' }];
		expect(helpers.formatErrors(errors)[0].field).toStrictEqual('items.0.tags.1');
	});

	it('should treat an error with neither instancePath nor dataPath as pointing at the root', () => {
		// Degenerate input (no AJV version produces it), but it must not
		// crash: the missing path is treated as the root path ''.
		const errors = [{
			keyword: 'required',
			params: {
				missingProperty: 'x',
			},
		}];

		expect(() => helpers.formatErrors(errors)).not.toThrow();
		expect(helpers.formatErrors(errors)[0].field).toStrictEqual('x');
	});

	// AJV 8 shape: `instancePath` is a JSON Pointer (RFC 6901). The cases
	// below mirror the `dataPath` set above, proving both shapes produce
	// the same `field` values.
	describe('with AJV 8 instancePath (JSON Pointer)', () => {
		it('should add a property field to each errors', () => {
			const errors = [{ instancePath: '/input' }];
			expect(helpers.formatErrors(errors)[0]).toHaveProperty('field', 'input');
		});

		it('should add a property field for required errors', () => {
			let errors = [{
				instancePath: '/nested',
				keyword: 'required',
				params: {
					missingProperty: 'input',
				},
			}];

			expect(helpers.formatErrors(errors)[0].field).toStrictEqual('nested.input');

			errors = [{
				instancePath: '',
				keyword: 'required',
				params: {
					missingProperty: 'input',
				},
			}];

			expect(helpers.formatErrors(errors)[0].field).toStrictEqual('input');
		});

		it('should convert pointer array segments to dot notation', () => {
			const errors = [{ instancePath: '/arr/0/input' }];
			expect(helpers.formatErrors(errors)[0].field).toStrictEqual('arr.0.input');
		});

		it('should convert every array index when the pointer contains several', () => {
			const errors = [{ instancePath: '/items/0/tags/1' }];
			expect(helpers.formatErrors(errors)[0].field).toStrictEqual('items.0.tags.1');
		});

		it('should map the root pointer to an empty field', () => {
			const errors = [{ instancePath: '' }];
			expect(helpers.formatErrors(errors)[0].field).toStrictEqual('');
		});

		it('should handle required errors inside an array item', () => {
			const errors = [{
				instancePath: '/list/0',
				keyword: 'required',
				params: {
					missingProperty: 'x',
				},
			}];

			expect(helpers.formatErrors(errors)[0].field).toStrictEqual('list.0.x');
		});

		it('should decode RFC 6901 escape sequences in pointer segments', () => {
			// `~1` encodes `/`, `~0` encodes `~`.
			expect(helpers.formatErrors([{ instancePath: '/a~1b' }])[0].field)
				.toStrictEqual('a/b');
			expect(helpers.formatErrors([{ instancePath: '/a~0b' }])[0].field)
				.toStrictEqual('a~b');
		});

		it('should decode ~1 before ~0 so that ~01 yields a literal ~1', () => {
			// `~01` encodes the literal string `~1`; decoding `~0` first
			// would wrongly produce `/`.
			expect(helpers.formatErrors([{ instancePath: '/a~01b' }])[0].field)
				.toStrictEqual('a~1b');
		});
	});
});

describe('.pointerToFieldPath(pointer)', () => {
	it('should convert a JSON Pointer to a dot-separated field path', () => {
		expect(helpers.pointerToFieldPath('/input')).toStrictEqual('input');
		expect(helpers.pointerToFieldPath('/arr/0/input')).toStrictEqual('arr.0.input');
		expect(helpers.pointerToFieldPath('/items/0/tags/1')).toStrictEqual('items.0.tags.1');
	});

	it('should map the root pointer to the empty string', () => {
		expect(helpers.pointerToFieldPath('')).toStrictEqual('');
	});

	it('should map the lone-slash pointer to the empty string', () => {
		// '/' is the pointer to the property whose key is the empty string
		// (RFC 6901). Its field path collides with the root pointer '' —
		// a documented, accepted limitation of the dot-path representation
		// (an empty-string key is not addressable in dot notation anyway).
		expect(helpers.pointerToFieldPath('/')).toStrictEqual('');
	});

	it('should preserve empty segments in the middle of a pointer', () => {
		// '/a//b' addresses data.a[''].b — empty segments are kept, which
		// surfaces as consecutive dots in the field path.
		expect(helpers.pointerToFieldPath('/a//b')).toStrictEqual('a..b');
	});

	it('should decode RFC 6901 escape sequences', () => {
		expect(helpers.pointerToFieldPath('/a~1b')).toStrictEqual('a/b');
		expect(helpers.pointerToFieldPath('/a~0b')).toStrictEqual('a~b');
		expect(helpers.pointerToFieldPath('/a~01b')).toStrictEqual('a~1b');
	});
});
