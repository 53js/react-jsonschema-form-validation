import React from 'react';
import { mount } from 'enzyme';

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
	const wrapper = mount(<Form onSubmit={() => {}} schema={{}} />);
	expect(wrapper).toMatchSnapshot();
});

it('should call onSubmit handler when form submitted', () => {
	const onSubmit = jest.fn();
	const data = { type: 'te' };

	const wrapper = mount(
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

	const wrapper = mount(
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

		let wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);

		expect(wrapper.instance().getFieldErrors('type').length).toStrictEqual(1);

		data = { type: 'te' };
		wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);
		expect(wrapper.instance().getFieldErrors('type').length).toStrictEqual(0);

		data = { type: null };
		wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);
		expect(wrapper.instance().getFieldErrors('type').length).toStrictEqual(1);
	});
});

describe('Form.handleFieldChange(event, value)', () => {
	it('should call onChange props with updated data based on event', () => {
		const data = { type: 'uuu' };
		const handleChange = jest.fn();
		const wrapper = mount(
			<Form
				data={data}
				onChange={handleChange}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);
		const form = wrapper.instance();
		const event = {
			target: {
				name: 'type',
				value: 'aaa',
			},
		};
		form.handleFieldChange(event);
		const expected = { type: 'aaa' };
		expect(handleChange).toHaveBeenCalledWith(expect.objectContaining(expected), event);
	});

	it('should create an event like object if event param is a string', () => {
		const data = { type: 'uuu' };
		const handleChange = jest.fn();
		const wrapper = mount(
			<Form
				data={data}
				onChange={handleChange}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);
		const form = wrapper.instance();
		const event = {
			target: {
				name: 'type',
				value: 'aaa',
			},
		};
		form.handleFieldChange(event.target.name, event.target.value);
		const expected = { type: 'aaa' };
		expect(handleChange).toHaveBeenCalledWith(expect.objectContaining(expected), event);
	});

	it('should not fail if onChange handler is not present', () => {
		const data = { type: 'uuu' };
		const wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);

		const form = wrapper.instance();
		const event = {
			target: {
				name: 'type',
				value: 'aaa',
			},
		};
		expect(() => {
			form.handleFieldChange(event);
		}).not.toThrow();
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

		let wrapper = mount(
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

		wrapper = mount(
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

it('should clean the event loop when unmounting', () => {
	const wrapper = mount(<Form onSubmit={() => {}} schema={{}} />);
	const componentWillUnmountSpy = jest.spyOn(Form.prototype, 'componentWillUnmount');
	const cancelSpy = jest.spyOn(wrapper.instance().throttledValidator, 'cancel');
	wrapper.unmount();
	expect(componentWillUnmountSpy).toHaveBeenCalled();
	expect(cancelSpy).toHaveBeenCalled();
	componentWillUnmountSpy.mockRestore();
	cancelSpy.mockRestore();
});
