import Ajv from 'ajv';
import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import * as helpers from './helpers';

describe('.createAjv()', () => {
	it('should return an Ajv instance', () => {
		const ajv = helpers.createAjv();
		expect(ajv).toBeInstanceOf(Ajv);
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

describe('.filterByFieldNameWithWildcard(fields, fieldName)', () => {
	it('should filter fields by their field property', () => {
		const fields = [
			{ field: 'name' },
			{ field: 'name1' },
			{ field: '1name' },
			{ field: '' },
			{},
		];

		expect(helpers.filterByFieldNameWithWildcard(fields, 'name'))
			.toEqual([{ field: 'name' }]);
	});

	it('should allow to filter fields by their field property beginning with using wildcard', () => {
		const fields = [
			{ field: 'name' },
			{ field: 'name1' },
			{ field: '1name' },
			{ field: '' },
			{},
		];

		expect(helpers.filterByFieldNameWithWildcard(fields, 'name*'))
			.toEqual([{ field: 'name' }, { field: 'name1' }]);
	});

	it('should treat the dot in a wildcard prefix as a literal character', () => {
		const fields = [
			{ field: 'user.email' },
			{ field: 'userX' },
			{ field: 'user' },
		];

		expect(helpers.filterByFieldNameWithWildcard(fields, 'user.*'))
			.toEqual([{ field: 'user.email' }]);
	});

	it('should not crash when the wildcard prefix contains an unclosed bracket', () => {
		const fields = [
			{ field: 'items[0].label' },
			{ field: 'items[1].label' },
			{ field: 'other' },
		];

		// The unescaped prefix `items[0` used to throw a SyntaxError
		// (unterminated character class) when compiled to a RegExp.
		expect(helpers.filterByFieldNameWithWildcard(fields, 'items[0*'))
			.toEqual([{ field: 'items[0].label' }]);
	});
});

describe('.getInputCheckboxValue(target)', () => {
	it('should return a boolean depending on checked attribute', () => {
		const { container } = render(<input name="field" type="checkbox" />);
		const checkbox = container.querySelector('input');
		checkbox.checked = true;
		expect(helpers.getInputCheckboxValue(checkbox)).toBe(true);
		checkbox.checked = false;
		expect(helpers.getInputCheckboxValue(checkbox)).toBe(false);
		checkbox.checked = undefined;
		expect(helpers.getInputCheckboxValue(checkbox)).toBe(false);
	});
});

describe('.getInputFileValue(target)', () => {
	it('should return a File if a file is selected and multiple attribute is false', () => {
		const { container } = render(<input name="field" type="file" />);
		const file = container.querySelector('input');
		Object.defineProperty(file, 'files', { value: ['file1'], configurable: true });
		Object.defineProperty(file, 'value', { value: 'path/file1' });
		expect(helpers.getInputFileValue(file)).toBe('file1');
		Object.defineProperty(file, 'files', { value: ['file1', 'file2'], configurable: true });
		expect(helpers.getInputFileValue(file)).toBe('file1');
	});

	it('should return a list of File if a file is selected and multiple attribute is true', () => {
		const { container } = render(<input name="field" type="file" />);
		const file = container.querySelector('input');
		file.multiple = true;
		Object.defineProperty(file, 'files', { value: ['file1'], configurable: true });
		Object.defineProperty(file, 'value', { value: 'path/file1' });
		expect(helpers.getInputFileValue(file)).toEqual(['file1']);
		Object.defineProperty(file, 'files', { value: ['file1', 'file2'], configurable: true });
		expect(helpers.getInputFileValue(file)).toEqual(['file1', 'file2']);
	});

	it('should an empty string if no file is selected', () => {
		const { container } = render(<input name="field" type="file" />);
		const file = container.querySelector('input');
		expect(helpers.getInputFileValue(file)).toBe('');
		file.multiple = true;
		expect(helpers.getInputFileValue(file)).toBe('');
	});
});

describe('.getInputNumberValue(target)', () => {
	it('should return a Number if input is not empty', () => {
		const { container } = render(<input name="field" type="number" />);
		const number = container.querySelector('input');
		number.value = 3;
		expect(helpers.getInputNumberValue(number)).toBe(3);
		number.value = Math.PI;
		expect(helpers.getInputNumberValue(number)).toBe(Math.PI);
		number.value = '3.14';
		expect(helpers.getInputNumberValue(number)).toBeCloseTo(Math.PI);
		number.value = -753141.43;
		expect(helpers.getInputNumberValue(number)).toBeCloseTo(-753141.43);
		number.value = 0;
		expect(helpers.getInputNumberValue(number)).toBeCloseTo(0);
	});

	it('should an empty string if input is empty', () => {
		const { container } = render(<input name="field" type="number" />);
		const number = container.querySelector('input');
		expect(helpers.getInputNumberValue(number)).toBe('');
	});
});

describe('.getFieldValue(target)', () => {
	// The `expect`s live inside the change handlers (as in the original,
	// `done`-based tests — Vitest does not support the `done` callback);
	// asserting the handler ran replaces the `done()` guarantee.
	it('should return string value for text input type text', () => {
		const handleChange = vi.fn(({ target }) => {
			const value = helpers.getFieldValue(target);
			expect(value).toBe('newvalue');
		});
		const { container } = render(<input name="field" type="text" onChange={handleChange} />);
		fireEvent.change(container.querySelector('input'), { target: { value: 'newvalue' } });
		expect(handleChange).toHaveBeenCalled();
	});

	it('should return a string value for textarea', () => {
		const handleChange = vi.fn((event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toBe('newvalue');
		});
		const { container } = render(<textarea name="field" type="text" onChange={handleChange} />);
		fireEvent.change(container.querySelector('textarea'), { target: { value: 'newvalue' } });
		expect(handleChange).toHaveBeenCalled();
	});

	it('should return a boolean value for checkbox', () => {
		const handleChange = vi.fn((event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toBe(true);
		});
		const { container } = render(<input name="field" type="checkbox" onChange={handleChange} />);
		// React listens to click events for checkbox change detection.
		fireEvent.click(container.querySelector('input'));
		expect(handleChange).toHaveBeenCalled();
	});

	it('should return a string value for radio', () => {
		const handleChange = vi.fn((event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toBe('value1');
		});
		const { container } = render(<input name="field" type="radio" value="value1" onChange={handleChange} />);
		// React listens to click events for radio change detection.
		fireEvent.click(container.querySelector('input'));
		expect(handleChange).toHaveBeenCalled();
	});

	it('should return a file or an array of files as value for input file', () => {
		const singleHandleChange = vi.fn((event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toBe('file1');
		});

		let { container } = render(<input name="field" type="file" onChange={singleHandleChange} />);
		let domInput = container.querySelector('input');
		Object.defineProperty(domInput, 'files', {
			value: ['file1'],
		});
		Object.defineProperty(domInput, 'value', {
			value: 'path/file1',
		});
		fireEvent.change(domInput);
		expect(singleHandleChange).toHaveBeenCalled();

		const multipleHandleChange = vi.fn((event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toEqual(['file1', 'file2']);
		});

		({ container } = render(<input name="field" type="file" multiple onChange={multipleHandleChange} />));
		domInput = container.querySelector('input');
		Object.defineProperty(domInput, 'files', {
			value: ['file1', 'file2'],
		});
		Object.defineProperty(domInput, 'value', {
			value: 'path/file1',
		});
		fireEvent.change(domInput);
		expect(multipleHandleChange).toHaveBeenCalled();
	});

	it('should a number value for input number', () => {
		const handleChange = vi.fn((event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toBe(12.2);
		});
		const { container } = render(<input name="field" type="number" onChange={handleChange} />);
		fireEvent.change(container.querySelector('input'), { target: { value: '12.2' } });
		expect(handleChange).toHaveBeenCalled();
	});
});

describe('.updateDataFromEvents(data, events)', () => {
	it('should copy data object if modified', () => {
		const data = { field: 'val' };
		const event = { target: { name: 'field', value: 'newval' } };
		const result = helpers.updateDataFromEvents(data, event);
		expect(result).toEqual({ field: 'newval' });
		expect(result).not.toBe(data);
	});

	it('should allow to pass events as a single Event or an array of Events', () => {
		const spy = vi.spyOn(Array.prototype, 'forEach');
		const data = { field: 'val' };
		const event = { target: { name: 'field', value: 'newval' } };
		helpers.updateDataFromEvents(data, [event]);
		expect(spy).toHaveBeenCalled();
		helpers.updateDataFromEvents(data, event);
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});

	it('should return data object if not modified', () => {
		const data = { field: 'val' };
		const result = helpers.updateDataFromEvents(data);
		expect(result).toBe(data);
	});

	it('should allow to update nested objects', () => {
		const data = { nested: { field: 'val' } };
		const event = { target: { name: 'nested.field', value: 'newval' } };
		const result = helpers.updateDataFromEvents(data, event);
		expect(result).toEqual({ nested: { field: 'newval' } });
		expect(result).not.toBe(data);
	});

	it('should allow to update nested arrays', () => {
		const data = { nested: { arr: [{ field: 'val1' }, { field: 'val2' }] } };
		const event = { target: { name: 'nested.arr.1.field', value: 'newval2' } };
		const result = helpers.updateDataFromEvents(data, event);
		expect(result).toEqual({ nested: { arr: [{ field: 'val1' }, { field: 'newval2' }] } });
		expect(result).not.toBe(data);
	});

	it('should copy only nested objects that have been modified', () => {
		const data = { nested1: { field: 'val' }, nested2: { field: 'val' } };
		const event = { target: { name: 'nested1.field', value: 'newval' } };
		const result = helpers.updateDataFromEvents(data, event);
		expect(result).toEqual({ nested1: { field: 'newval' }, nested2: { field: 'val' } });
		expect(result).not.toBe(data);
		expect(result.nested1).not.toBe(data.nested1);
		expect(result.nested2).toBe(data.nested2);
	});
});
