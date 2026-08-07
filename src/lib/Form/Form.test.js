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

// jsdom does not implement Element#scrollIntoView: define a mock so the
// native scrolling in Form.scrollToFirstError() can run and be asserted on.
const scrollIntoViewMock = jest.fn();
const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeAll(() => {
	Element.prototype.scrollIntoView = scrollIntoViewMock;
});

beforeEach(() => {
	scrollIntoViewMock.mockClear();
});

afterAll(() => {
	if (originalScrollIntoView) {
		Element.prototype.scrollIntoView = originalScrollIntoView;
	} else {
		delete Element.prototype.scrollIntoView;
	}
});

it('should match snapshot', () => {
	const wrapper = mount(<Form onSubmit={() => {}} schema={{}} />);
	// Snapshot the rendered <form> element only: snapshotting the <Form>
	// component would serialize its props — including the whole AJV instance,
	// whose internal cache differs between run modes (flaky snapshot).
	expect(wrapper.find('form')).toMatchSnapshot();
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

describe('resetOnSubmit prop', () => {
	it('should reset the form state on a successful submit by default', () => {
		const onSubmit = jest.fn();
		const data = { type: 'te' };

		const wrapper = mount(
			<Form
				data={data}
				onSubmit={onSubmit}
				schema={testSchema}
			/>,
		);

		wrapper.instance().touch('type');
		expect(wrapper.state().touchedFields).toEqual(['type']);

		wrapper.find('form').simulate('submit', { preventDefault() {} });

		expect(onSubmit).toHaveBeenCalled();
		expect(wrapper.state().touchedFields).toEqual([]);
		expect(wrapper.state().isSubmitted).toBe(false);
	});

	it('should keep touched/submitted state on a successful submit when resetOnSubmit is false', () => {
		const onSubmit = jest.fn();
		const data = { type: 'te' };

		const wrapper = mount(
			<Form
				data={data}
				onSubmit={onSubmit}
				resetOnSubmit={false}
				schema={testSchema}
			/>,
		);

		wrapper.instance().touch('type');
		wrapper.find('form').simulate('submit', { preventDefault() {} });

		// onSubmit still runs, but the visual state survives the submit (so a
		// later server-side failure does not leave the user with a blank form
		// state).
		expect(onSubmit).toHaveBeenCalled();
		expect(wrapper.state().touchedFields).toEqual(['type']);
		expect(wrapper.state().isSubmitted).toBe(true);
	});
});

describe('Form.reset()', () => {
	it('should keep fieldErrorsVersion monotonic (the FieldError registry survives a reset)', () => {
		const wrapper = mount(<Form onSubmit={() => {}} schema={{}} />);
		const instance = wrapper.instance();

		instance.registerFieldError('key', 'type', 'jfv1_type_err');
		instance.touch('type');
		const versionBeforeReset = wrapper.state().fieldErrorsVersion;
		expect(versionBeforeReset).toBeGreaterThan(0);

		instance.reset();

		// The touched/submitted state is wiped, but the version counter is
		// preserved: the registry (instance Map) was not emptied by reset().
		expect(wrapper.state().touchedFields).toEqual([]);
		expect(wrapper.state().fieldErrorsVersion).toBe(versionBeforeReset);
	});
});

describe('context reset()', () => {
	it('should expose reset through the form context and reset the state when called', () => {
		const data = { type: 'invalid-value' };

		const wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);

		wrapper.instance().touch('type');
		// Failed submit (invalid data): isSubmitted stays true, nothing resets.
		wrapper.find('form').simulate('submit', { preventDefault() {} });
		expect(wrapper.state().touchedFields).toEqual(['type']);
		expect(wrapper.state().isSubmitted).toBe(true);

		const context = wrapper.instance().getContext();
		expect(typeof context.reset).toBe('function');
		context.reset();

		expect(wrapper.state().touchedFields).toEqual([]);
		expect(wrapper.state().isSubmitted).toBe(false);
	});
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

	it('should check every name of the list, not only the first one', () => {
		// 'type' is valid, only 'name' (2nd element) has an error: a naive
		// implementation checking names[0] only would return false here.
		const data = {
			type: 'te',
			name: 'HE',
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

		const wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={newSchema}
			/>,
		);

		expect(wrapper.instance().isFieldInvalid(['type', 'name'])).toBe(true);
	});
});

describe('Form.scrollToFirstError()', () => {
	it('should not throw when no DOM element matches the first error field', () => {
		const data = { type: 'invalid-value' };

		// No <Field name="type"> rendered: document.getElementsByName('type')
		// is empty when the submit fails.
		const wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);

		expect(() => {
			wrapper.find('form').simulate('submit', { preventDefault() {} });
		}).not.toThrow();
	});

	it('should move focus to the first invalid field after a failed submit', () => {
		const data = { type: 'invalid-value' };
		const container = document.createElement('div');
		document.body.appendChild(container);

		const wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			>
				<Field
					id="test-type"
					name="type"
					type="text"
				/>
			</Form>,
			{ attachTo: container },
		);

		try {
			wrapper.find('form').simulate('submit', { preventDefault() {} });

			expect(document.activeElement).toBe(document.getElementById('test-type'));
		} finally {
			wrapper.detach();
			document.body.removeChild(container);
		}
	});

	it('should scroll the first invalid field into view with smooth/center defaults', () => {
		const data = { type: 'invalid-value' };
		const container = document.createElement('div');
		document.body.appendChild(container);

		const wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			>
				<Field
					id="test-type"
					name="type"
					type="text"
				/>
			</Form>,
			{ attachTo: container },
		);

		try {
			wrapper.find('form').simulate('submit', { preventDefault() {} });

			expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
			expect(scrollIntoViewMock).toHaveBeenCalledWith({
				behavior: 'smooth',
				block: 'center',
				inline: 'nearest',
			});
			// The element scrolled into view is the first invalid field.
			expect(scrollIntoViewMock.mock.instances[0]).toBe(document.getElementById('test-type'));
		} finally {
			wrapper.detach();
			document.body.removeChild(container);
		}
	});

	it('should map the legacy align option to block and ignore offset/duration/ease', () => {
		const data = { type: 'invalid-value' };
		const container = document.createElement('div');
		document.body.appendChild(container);

		const wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
				scrollOptions={{
					align: 'top',
					offset: 120,
					duration: 900,
					ease: 'inOutQuad',
				}}
			>
				<Field
					id="test-type"
					name="type"
					type="text"
				/>
			</Form>,
			{ attachTo: container },
		);

		try {
			wrapper.find('form').simulate('submit', { preventDefault() {} });

			// `align: 'top'` maps to `block: 'start'`; the unsupported legacy
			// options are not forwarded to scrollIntoView.
			expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
			expect(scrollIntoViewMock).toHaveBeenCalledWith({
				behavior: 'smooth',
				block: 'start',
				inline: 'nearest',
			});
		} finally {
			wrapper.detach();
			document.body.removeChild(container);
		}
	});

	it('should forward native scrollIntoView options as-is', () => {
		const data = { type: 'invalid-value' };
		const container = document.createElement('div');
		document.body.appendChild(container);

		const wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
				scrollOptions={{
					behavior: 'auto',
					block: 'end',
					inline: 'start',
				}}
			>
				<Field
					id="test-type"
					name="type"
					type="text"
				/>
			</Form>,
			{ attachTo: container },
		);

		try {
			wrapper.find('form').simulate('submit', { preventDefault() {} });

			expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
			expect(scrollIntoViewMock).toHaveBeenCalledWith({
				behavior: 'auto',
				block: 'end',
				inline: 'start',
			});
		} finally {
			wrapper.detach();
			document.body.removeChild(container);
		}
	});

	it('should still move focus without throwing when the element does not implement scrollIntoView', () => {
		const data = { type: 'invalid-value' };
		const container = document.createElement('div');
		document.body.appendChild(container);

		const wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			>
				<Field
					id="test-type"
					name="type"
					type="text"
				/>
			</Form>,
			{ attachTo: container },
		);

		const input = document.getElementById('test-type');
		// Shadow the prototype mock with an own property: simulates an
		// environment (e.g. a consumer's jsdom test setup) where
		// scrollIntoView is not implemented at all.
		input.scrollIntoView = undefined;

		try {
			expect(() => {
				wrapper.find('form').simulate('submit', { preventDefault() {} });
			}).not.toThrow();

			// Scrolling is skipped, but the a11y focus move still happens.
			expect(scrollIntoViewMock).not.toHaveBeenCalled();
			expect(document.activeElement).toBe(input);
		} finally {
			wrapper.detach();
			document.body.removeChild(container);
		}
	});

	it('should not throw when called directly while the form has no errors', () => {
		const data = { type: 'te' };

		const wrapper = mount(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);

		expect(() => {
			wrapper.instance().scrollToFirstError();
		}).not.toThrow();
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
