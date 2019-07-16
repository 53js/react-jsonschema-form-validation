import Ajv from 'ajv';

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
