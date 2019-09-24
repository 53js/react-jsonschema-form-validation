import Ajv from 'ajv';
import React from 'react';
import { mount } from 'enzyme';

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
});

describe('.getInputCheckboxValue(target)', () => {
	it('should return a boolean depending on checked attribute', () => {
		const input = mount(<input name="field" type="checkbox" />);
		input.instance().checked = true;
		const checkbox = input.getDOMNode();
		expect(helpers.getInputCheckboxValue(checkbox)).toBe(true);
		input.instance().checked = false;
		expect(helpers.getInputCheckboxValue(checkbox)).toBe(false);
		input.instance().checked = undefined;
		expect(helpers.getInputCheckboxValue(checkbox)).toBe(false);
	});
});

describe('.getInputFileValue(target)', () => {
	it('should return a File if a file is selected and multiple attribute is false', () => {
		const input = mount(<input name="field" type="file" />);
		const file = input.getDOMNode();
		Object.defineProperty(file, 'files', { value: ['file1'], configurable: true });
		Object.defineProperty(file, 'value', { value: 'path/file1' });
		expect(helpers.getInputFileValue(file)).toBe('file1');
		Object.defineProperty(file, 'files', { value: ['file1', 'file2'], configurable: true });
		expect(helpers.getInputFileValue(file)).toBe('file1');
	});

	it('should return a list of File if a file is selected and multiple attribute is true', () => {
		const input = mount(<input name="field" type="file" />);
		const file = input.getDOMNode();
		file.multiple = true;
		Object.defineProperty(file, 'files', { value: ['file1'], configurable: true });
		Object.defineProperty(file, 'value', { value: 'path/file1' });
		expect(helpers.getInputFileValue(file)).toEqual(['file1']);
		Object.defineProperty(file, 'files', { value: ['file1', 'file2'], configurable: true });
		expect(helpers.getInputFileValue(file)).toEqual(['file1', 'file2']);
	});

	it('should an empty string if no file is selected', () => {
		const input = mount(<input name="field" type="file" />);
		const file = input.getDOMNode();
		expect(helpers.getInputFileValue(file)).toBe('');
		file.multiple = true;
		expect(helpers.getInputFileValue(file)).toBe('');
	});
});

describe('.getInputNumberValue(target)', () => {
	it('should return a Number if input is not empty', () => {
		const input = mount(<input name="field" type="number" />);
		const number = input.getDOMNode();
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
		const input = mount(<input name="field" type="number" />);
		const number = input.getDOMNode();
		expect(helpers.getInputNumberValue(number)).toBe('');
	});
});

describe('.getFieldValue(target)', () => {
	it('should return string value for text input type text', (done) => {
		const handleChange = ({ target }) => {
			const value = helpers.getFieldValue(target);
			expect(value).toBe('newvalue');
			done();
		};
		const input = mount(<input name="field" type="text" onChange={handleChange} />);
		input.getDOMNode().value = 'newvalue';
		input.simulate('change');
	});

	it('should return a string value for textarea', (done) => {
		const handleChange = (event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toBe('newvalue');
			done();
		};
		const input = mount(<textarea name="field" type="text" onChange={handleChange} />);
		input.instance().value = 'newvalue';
		input.simulate('change');
	});

	it('should return a boolean value for checkbox', (done) => {
		const handleChange = (event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toBe(true);
			done();
		};
		const input = mount(<input name="field" type="checkbox" onChange={handleChange} />);
		input.instance().checked = true;
		input.simulate('change');
	});

	it('should return a string value for radio', (done) => {
		const handleChange = (event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toBe('value1');
			done();
		};
		const input = mount(<input name="field" type="radio" value="value1" onChange={handleChange} />);
		input.instance().checked = true;
		input.simulate('change');
	});

	it('should return a file or an array of files as value for input file', (done) => {
		let handleChange = (event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toBe('file1');
			done();
		};

		let input = mount(<input name="field" type="file" onChange={handleChange} />);
		let domInput = input.getDOMNode();
		Object.defineProperty(domInput, 'files', {
			value: ['file1'],
		});
		Object.defineProperty(domInput, 'value', {
			value: 'path/file1',
		});
		input.simulate('change');

		handleChange = (event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toEqual(['file1', 'file2']);
			done();
		};

		input = mount(<input name="field" type="file" multiple onChange={handleChange} />);
		domInput = input.getDOMNode();
		Object.defineProperty(domInput, 'files', {
			value: ['file1', 'file2'],
		});
		Object.defineProperty(domInput, 'value', {
			value: 'path/file1',
		});
		input.simulate('change');
	});

	it('should a number value for input number', (done) => {
		const handleChange = (event) => {
			const { target } = event;
			const value = helpers.getFieldValue(target);
			expect(value).toBe(12.2);
			done();
		};
		const input = mount(<input name="field" type="number" onChange={handleChange} />);
		input.instance().value = '12.2';
		input.simulate('change');
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
		const spy = jest.spyOn(Array.prototype, 'forEach');
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
