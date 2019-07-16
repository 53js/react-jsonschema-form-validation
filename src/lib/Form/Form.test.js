import React from 'react';
import { shallow, mount } from 'enzyme';

import Form from './Form';
import Field from '../Field';

const testSchema = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: ['te', 'ta'] },
	},
	required: [
		'type',
	],
};


it('should match snapshot', () => {
	const wrapper = shallow(<Form onSubmit={() => { }} schema={{}} />);
	expect(wrapper).toMatchSnapshot();
});

it('should call onSubmit handler when form submitted', () => {
	const onSubmit = jest.fn();
	const data = { type: 'te' };

	const wrapper = shallow(
		<Form
			data={data}
			onSubmit={onSubmit}
			schema={testSchema}
		/>,
	);

	wrapper.find('form').simulate('submit', { preventDefault() {} });
	expect(onSubmit).toHaveBeenCalled();
});

it('should not call onSubmit handler as the form is not valid', () => {
	const onSubmit = jest.fn();
	const data = { type: 'pioiv' };

	const wrapper = shallow(
		<Form
			data={data}
			onSubmit={onSubmit}
			schema={testSchema}
		/>,
	);

	wrapper.find('form').simulate('submit', { preventDefault() {} });
	expect(onSubmit).not.toHaveBeenCalled();
});

describe('Form.getFieldErrors()', () => {
	it('should return a list of fields having errors', () => {
		let data = { type: 'uuu' };

		let wrapper = shallow(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);

		expect(wrapper.instance().getFieldErrors('type').length).toStrictEqual(1);

		data = { type: 'te' };
		wrapper = shallow(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);
		expect(wrapper.instance().getFieldErrors('type').length).toStrictEqual(0);

		data = { type: null };
		wrapper = shallow(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);
		expect(wrapper.instance().getFieldErrors('type').length).toStrictEqual(1);
	});
});

describe('Form.isFieldTouched(fieldNames)', () => {
	it('should return true if at least one of the fields named on the list is touched, false otherwise', () => {
		const wrapper = mount(
			<Form
				onSubmit={() => {}}
				schema={{}}
			>
				<Field
					id="test-type"
					name="type"
					type="text"
				/>
				<Field
					id="test-name"
					name="name"
					type="text"
				/>
			</Form>,
		);

		expect(wrapper.instance().isFieldTouched(['type'])).toStrictEqual(false);
		expect(wrapper.instance().isFieldTouched(['name'])).toStrictEqual(false);
		expect(wrapper.instance().isFieldTouched(['type', 'name'])).toStrictEqual(false);

		wrapper.find('#test-type').hostNodes().simulate('blur', { preventDefault() {} });

		expect(wrapper.instance().isFieldTouched(['type'])).toStrictEqual(true);
		expect(wrapper.instance().isFieldTouched(['name'])).toStrictEqual(false);
		expect(wrapper.instance().isFieldTouched(['type', 'name'])).toStrictEqual(true);

		wrapper.find('#test-name').hostNodes().simulate('blur', { preventDefault() {} });

		expect(wrapper.instance().isFieldTouched(['type'])).toStrictEqual(true);
		expect(wrapper.instance().isFieldTouched(['name'])).toStrictEqual(true);
		expect(wrapper.instance().isFieldTouched(['type', 'name'])).toStrictEqual(true);
	});
});

describe('Form.isFieldInvalid(fieldNames)', () => {
	it('should return true if at least one of the fields named on the list has an error, false otherwise', () => {
		const data = {
			type: 'deon',
			name: 'Testing',
		};

		const newSchema = {
			type: 'object',
			properties: {
				type: { type: 'string', enum: ['te', 'ta'] },
				name: { type: 'string', minLength: 6 },
			},
			required: [
				'type',
				'name',
			],
		};

		let wrapper = shallow(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={newSchema}
			/>,
		);

		expect(wrapper.instance().isFieldInvalid('type')).toBe(true);
		expect(wrapper.instance().isFieldInvalid(['name'])).toBe(false);

		const newData = {
			type: 'te',
			name: 'HE',
		};

		wrapper = shallow(
			<Form
				data={newData}
				onSubmit={() => {}}
				schema={newSchema}
			/>,
		);

		expect(wrapper.instance().isFieldInvalid('type')).toBe(false);
		expect(wrapper.instance().isFieldInvalid(['name'])).toBe(true);
	});
});

describe('Form.isInvalid()', () => {
	it('should return true if there is an error on the form, false otherwise', () => {
		const data = {
			type: 'sbbzrg',
			name: 'ee',
		};

		const newSchema = {
			type: 'object',
			properties: {
				type: { type: 'string', enum: ['te', 'ta'] },
				name: { type: 'string', minLength: 6 },
			},
			required: [
				'type',
				'name',
			],
		};

		const wrapper = shallow(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={newSchema}
			/>,
		);

		expect(wrapper.instance().isInvalid()).toBe(true);
	});
});

describe('Form.isFieldTouched(fieldName)', () => {
	it('should return true if the field of name "fieldName" is touched, false otherwise', () => {
		const wrapper = mount(
			<Form
				onSubmit={() => {}}
				schema={{}}
			>
				<Field
					id="test-type"
					name="type"
					type="text"
				/>
			</Form>,
		);

		expect(wrapper.instance().isFieldTouched('type')).toStrictEqual(false);
		wrapper.find('#test-type').hostNodes().simulate('blur');
		expect(wrapper.instance().isFieldTouched('type')).toStrictEqual(true);
	});
});

describe('Form.isTouched()', () => {
	it('should return true if one of the fields in the form is touched, false otherwise', () => {
		const wrapper = mount(
			<Form
				onSubmit={() => {}}
				schema={{}}
			>
				<Field
					id="test-type"
					name="type"
					type="text"
				/>
				<Field
					id="test-name"
					name="name"
					type="text"
				/>
				<Field
					id="test-description"
					name="description"
					type="text"
				/>
			</Form>,
		);

		expect(wrapper.instance().isTouched()).toStrictEqual(false);
		wrapper.find('#test-type').hostNodes().simulate('blur', { preventDefault() {} });
		expect(wrapper.instance().isTouched()).toStrictEqual(true);
		wrapper.find('#test-name').hostNodes().simulate('blur', { preventDefault() {} });
		wrapper.find('#test-description').hostNodes().simulate('blur');
		expect(wrapper.instance().isTouched()).toStrictEqual(true);
	});
});

describe('Form.touch(fieldName)', () => {
	it('should add the field named "fieldName" with true value in the touched list in form state', () => {
		const wrapper = mount(
			<Form
				onSubmit={() => {}}
				schema={{}}
			>
				<Field
					id="test-type"
					name="type"
					type="text"
				/>
				<Field
					id="test-name"
					name="name"
					type="text"
				/>
				<Field
					id="test-description"
					name="description"
					type="text"
				/>
			</Form>,
		);

		expect(wrapper.state().touchedFields).toEqual([]);
		wrapper.instance().touch('type');
		expect(wrapper.state().touchedFields).toEqual(['type']);
		wrapper.instance().touch('name');
		expect(wrapper.state().touchedFields).toEqual(['type', 'name']);
		wrapper.instance().touch('description');
		expect(wrapper.state().touchedFields).toEqual(['type', 'name', 'description']);
	});
});
