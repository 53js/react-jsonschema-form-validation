import Ajv2020 from 'ajv/dist/2020';
import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import Form from './Form';
import Field from '../Field';
import { createAjv } from './helpers';

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
const scrollIntoViewMock = vi.fn();
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
	const { container } = render(<Form onSubmit={() => {}} schema={{}} />);
	// Snapshot the rendered <form> element only (DOM snapshot).
	expect(container.querySelector('form')).toMatchSnapshot();
});

it('should call onSubmit handler when form submitted', () => {
	const onSubmit = vi.fn();
	const data = { type: 'te' };

	const { container } = render(
		<Form
			data={data}
			onSubmit={onSubmit}
			schema={testSchema}
		/>,
	);

	fireEvent.submit(container.querySelector('form'));
	expect(onSubmit).toHaveBeenCalled();
});

it('should not call onSubmit handler as the form is not valid', () => {
	const onSubmit = vi.fn();
	const data = { type: 'pioiv' };

	const { container } = render(
		<Form
			data={data}
			onSubmit={onSubmit}
			schema={testSchema}
		/>,
	);

	fireEvent.submit(container.querySelector('form'));
	expect(onSubmit).not.toHaveBeenCalled();
});

describe('resetOnSubmit prop', () => {
	it('should reset the form state on a successful submit by default', () => {
		const onSubmit = vi.fn();
		const data = { type: 'te' };

		const ref = React.createRef();
		const { container } = render(
			<Form
				data={data}
				onSubmit={onSubmit}
				ref={ref}
				schema={testSchema}
			/>,
		);

		ref.current.touch('type');
		expect(ref.current.state.touchedFields).toEqual(['type']);

		fireEvent.submit(container.querySelector('form'));

		expect(onSubmit).toHaveBeenCalled();
		expect(ref.current.state.touchedFields).toEqual([]);
		expect(ref.current.state.isSubmitted).toBe(false);
	});

	it('should keep touched/submitted state on a successful submit when resetOnSubmit is false', () => {
		const onSubmit = vi.fn();
		const data = { type: 'te' };

		const ref = React.createRef();
		const { container } = render(
			<Form
				data={data}
				onSubmit={onSubmit}
				ref={ref}
				resetOnSubmit={false}
				schema={testSchema}
			/>,
		);

		ref.current.touch('type');
		fireEvent.submit(container.querySelector('form'));

		// onSubmit still runs, but the visual state survives the submit (so a
		// later server-side failure does not leave the user with a blank form
		// state).
		expect(onSubmit).toHaveBeenCalled();
		expect(ref.current.state.touchedFields).toEqual(['type']);
		expect(ref.current.state.isSubmitted).toBe(true);
	});
});

describe('Form.reset()', () => {
	it('should keep fieldErrorsVersion monotonic (the FieldError registry survives a reset)', () => {
		const ref = React.createRef();
		render(<Form onSubmit={() => {}} ref={ref} schema={{}} />);
		const instance = ref.current;

		instance.registerFieldError('key', 'type', 'jfv1_type_err');
		instance.touch('type');
		const versionBeforeReset = instance.state.fieldErrorsVersion;
		expect(versionBeforeReset).toBeGreaterThan(0);

		instance.reset();

		// The touched/submitted state is wiped, but the version counter is
		// preserved: the registry (instance Map) was not emptied by reset().
		expect(instance.state.touchedFields).toEqual([]);
		expect(instance.state.fieldErrorsVersion).toBe(versionBeforeReset);
	});
});

describe('context reset()', () => {
	it('should expose reset through the form context and reset the state when called', () => {
		const data = { type: 'invalid-value' };

		const ref = React.createRef();
		const { container } = render(
			<Form
				data={data}
				onSubmit={() => {}}
				ref={ref}
				schema={testSchema}
			/>,
		);

		ref.current.touch('type');
		// Failed submit (invalid data): isSubmitted stays true, nothing resets.
		fireEvent.submit(container.querySelector('form'));
		expect(ref.current.state.touchedFields).toEqual(['type']);
		expect(ref.current.state.isSubmitted).toBe(true);

		const context = ref.current.getContext();
		expect(typeof context.reset).toBe('function');
		context.reset();

		expect(ref.current.state.touchedFields).toEqual([]);
		expect(ref.current.state.isSubmitted).toBe(false);
	});
});

describe('Form.getFieldErrors()', () => {
	it('should return a list of fields having errors', () => {
		let data = { type: 'uuu' };

		let ref = React.createRef();
		render(
			<Form
				data={data}
				onSubmit={() => {}}
				ref={ref}
				schema={testSchema}
			/>,
		);

		expect(ref.current.getFieldErrors('type').length).toStrictEqual(1);

		data = { type: 'te' };
		ref = React.createRef();
		render(
			<Form
				data={data}
				onSubmit={() => {}}
				ref={ref}
				schema={testSchema}
			/>,
		);
		expect(ref.current.getFieldErrors('type').length).toStrictEqual(0);

		data = { type: null };
		ref = React.createRef();
		render(
			<Form
				data={data}
				onSubmit={() => {}}
				ref={ref}
				schema={testSchema}
			/>,
		);
		expect(ref.current.getFieldErrors('type').length).toStrictEqual(1);
	});
});

describe('Form.handleFieldChange(event, value)', () => {
	it('should call onChange props with updated data based on event', () => {
		const data = { type: 'uuu' };
		const handleChange = vi.fn();
		const ref = React.createRef();
		render(
			<Form
				data={data}
				onChange={handleChange}
				onSubmit={() => {}}
				ref={ref}
				schema={testSchema}
			/>,
		);
		const form = ref.current;
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
		const handleChange = vi.fn();
		const ref = React.createRef();
		render(
			<Form
				data={data}
				onChange={handleChange}
				onSubmit={() => {}}
				ref={ref}
				schema={testSchema}
			/>,
		);
		const form = ref.current;
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
		const ref = React.createRef();
		render(
			<Form
				data={data}
				onSubmit={() => {}}
				ref={ref}
				schema={testSchema}
			/>,
		);

		const form = ref.current;
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
		const ref = React.createRef();
		const { container } = render(
			<Form
				onSubmit={() => {}}
				ref={ref}
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

		expect(ref.current.isFieldTouched(['type'])).toStrictEqual(false);
		expect(ref.current.isFieldTouched(['name'])).toStrictEqual(false);
		expect(ref.current.isFieldTouched(['type', 'name'])).toStrictEqual(false);

		fireEvent.blur(container.querySelector('#test-type'));

		expect(ref.current.isFieldTouched(['type'])).toStrictEqual(true);
		expect(ref.current.isFieldTouched(['name'])).toStrictEqual(false);
		expect(ref.current.isFieldTouched(['type', 'name'])).toStrictEqual(true);

		fireEvent.blur(container.querySelector('#test-name'));

		expect(ref.current.isFieldTouched(['type'])).toStrictEqual(true);
		expect(ref.current.isFieldTouched(['name'])).toStrictEqual(true);
		expect(ref.current.isFieldTouched(['type', 'name'])).toStrictEqual(true);
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

		let ref = React.createRef();
		render(
			<Form
				data={data}
				onSubmit={() => {}}
				ref={ref}
				schema={newSchema}
			/>,
		);

		expect(ref.current.isFieldInvalid('type')).toBe(true);
		expect(ref.current.isFieldInvalid(['name'])).toBe(false);

		const newData = {
			type: 'te',
			name: 'HE',
		};

		ref = React.createRef();
		render(
			<Form
				data={newData}
				onSubmit={() => {}}
				ref={ref}
				schema={newSchema}
			/>,
		);

		expect(ref.current.isFieldInvalid('type')).toBe(false);
		expect(ref.current.isFieldInvalid(['name'])).toBe(true);
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

		const ref = React.createRef();
		render(
			<Form
				data={data}
				onSubmit={() => {}}
				ref={ref}
				schema={newSchema}
			/>,
		);

		expect(ref.current.isFieldInvalid(['type', 'name'])).toBe(true);
	});
});

describe('Form.scrollToFirstError()', () => {
	it('should not throw when no DOM element matches the first error field', () => {
		const data = { type: 'invalid-value' };

		// No <Field name="type"> rendered: document.getElementsByName('type')
		// is empty when the submit fails.
		const { container } = render(
			<Form
				data={data}
				onSubmit={() => {}}
				schema={testSchema}
			/>,
		);

		expect(() => {
			fireEvent.submit(container.querySelector('form'));
		}).not.toThrow();
	});

	it('should move focus to the first invalid field after a failed submit', () => {
		const data = { type: 'invalid-value' };

		// RTL renders inside document.body: document.getElementsByName and
		// focus work without any manual attach/detach.
		const { container } = render(
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
		);

		fireEvent.submit(container.querySelector('form'));

		expect(document.activeElement).toBe(document.getElementById('test-type'));
	});

	it('should scroll the first invalid field into view with smooth/center defaults', () => {
		const data = { type: 'invalid-value' };

		const { container } = render(
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
		);

		fireEvent.submit(container.querySelector('form'));

		expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
		expect(scrollIntoViewMock).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'center',
			inline: 'nearest',
		});
		// The element scrolled into view is the first invalid field.
		expect(scrollIntoViewMock.mock.instances[0]).toBe(document.getElementById('test-type'));
	});

	it('should map the legacy align option to block and ignore offset/duration/ease', () => {
		const data = { type: 'invalid-value' };

		const { container } = render(
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
		);

		fireEvent.submit(container.querySelector('form'));

		// `align: 'top'` maps to `block: 'start'`; the unsupported legacy
		// options are not forwarded to scrollIntoView.
		expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
		expect(scrollIntoViewMock).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'start',
			inline: 'nearest',
		});
	});

	it('should forward native scrollIntoView options as-is', () => {
		const data = { type: 'invalid-value' };

		const { container } = render(
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
		);

		fireEvent.submit(container.querySelector('form'));

		expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
		expect(scrollIntoViewMock).toHaveBeenCalledWith({
			behavior: 'auto',
			block: 'end',
			inline: 'start',
		});
	});

	it('should still move focus without throwing when the element does not implement scrollIntoView', () => {
		const data = { type: 'invalid-value' };

		const { container } = render(
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
		);

		const input = document.getElementById('test-type');
		// Shadow the prototype mock with an own property: simulates an
		// environment (e.g. a consumer's jsdom test setup) where
		// scrollIntoView is not implemented at all.
		input.scrollIntoView = undefined;

		expect(() => {
			fireEvent.submit(container.querySelector('form'));
		}).not.toThrow();

		// Scrolling is skipped, but the a11y focus move still happens.
		expect(scrollIntoViewMock).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(input);
	});

	it('should not throw when called directly while the form has no errors', () => {
		const data = { type: 'te' };

		const ref = React.createRef();
		render(
			<Form
				data={data}
				onSubmit={() => {}}
				ref={ref}
				schema={testSchema}
			/>,
		);

		expect(() => {
			ref.current.scrollToFirstError();
		}).not.toThrow();
	});
});

describe('Form.isFieldTouched(fieldName)', () => {
	it('should return true if the field of name "fieldName" is touched, false otherwise', () => {
		const ref = React.createRef();
		const { container } = render(
			<Form
				onSubmit={() => {}}
				ref={ref}
				schema={{}}
			>
				<Field
					id="test-type"
					name="type"
					type="text"
				/>
			</Form>,
		);

		expect(ref.current.isFieldTouched('type')).toStrictEqual(false);
		fireEvent.blur(container.querySelector('#test-type'));
		expect(ref.current.isFieldTouched('type')).toStrictEqual(true);
	});
});

describe('Form.isTouched()', () => {
	it('should return true if one of the fields in the form is touched, false otherwise', () => {
		const ref = React.createRef();
		const { container } = render(
			<Form
				onSubmit={() => {}}
				ref={ref}
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

		expect(ref.current.isTouched()).toStrictEqual(false);
		fireEvent.blur(container.querySelector('#test-type'));
		expect(ref.current.isTouched()).toStrictEqual(true);
		fireEvent.blur(container.querySelector('#test-name'));
		fireEvent.blur(container.querySelector('#test-description'));
		expect(ref.current.isTouched()).toStrictEqual(true);
	});
});

describe('Form.touch(fieldName)', () => {
	it('should add the field named "fieldName" with true value in the touched list in form state', () => {
		const ref = React.createRef();
		render(
			<Form
				onSubmit={() => {}}
				ref={ref}
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

		expect(ref.current.state.touchedFields).toEqual([]);
		ref.current.touch('type');
		expect(ref.current.state.touchedFields).toEqual(['type']);
		ref.current.touch('name');
		expect(ref.current.state.touchedFields).toEqual(['type', 'name']);
		ref.current.touch('description');
		expect(ref.current.state.touchedFields).toEqual(['type', 'name', 'description']);
	});
});

describe('AJV 8 integration', () => {
	it('should validate $data references through the form (password confirmation)', () => {
		const schema = {
			type: 'object',
			properties: {
				password: { type: 'string' },
				confirm: { type: 'string', const: { $data: '1/password' } },
			},
		};

		let ref = React.createRef();
		render(
			<Form
				data={{ password: 's3cret', confirm: 'nope' }}
				onSubmit={() => {}}
				ref={ref}
				schema={schema}
			/>,
		);

		const errors = ref.current.getFieldErrors('confirm');
		expect(errors.length).toStrictEqual(1);
		expect(errors[0].keyword).toStrictEqual('const');

		ref = React.createRef();
		render(
			<Form
				data={{ password: 's3cret', confirm: 's3cret' }}
				onSubmit={() => {}}
				ref={ref}
				schema={schema}
			/>,
		);
		expect(ref.current.state.valid).toBe(true);
	});

	it('should report a format error for an invalid email (ajv-formats end-to-end)', () => {
		const schema = {
			type: 'object',
			properties: {
				email: { type: 'string', format: 'email' },
			},
		};

		const ref = React.createRef();
		render(
			<Form
				data={{ email: 'not-an-email' }}
				onSubmit={() => {}}
				ref={ref}
				schema={schema}
			/>,
		);

		const errors = ref.current.getFieldErrors('email');
		expect(errors.length).toStrictEqual(1);
		expect(errors[0].keyword).toStrictEqual('format');
	});

	it('should map a nested required error to the missing property path', () => {
		// AJV 8 reports { instancePath: '/user', params: { missingProperty:
		// 'email' } }: the formatted field must be 'user.email' so that
		// <FieldError name="user.email"> and the a11y focus/scroll target
		// the right input.
		const schema = {
			type: 'object',
			properties: {
				user: {
					type: 'object',
					properties: {
						email: { type: 'string' },
					},
					required: ['email'],
				},
			},
		};

		const ref = React.createRef();
		render(
			<Form
				data={{ user: {} }}
				onSubmit={() => {}}
				ref={ref}
				schema={schema}
			/>,
		);

		const errors = ref.current.getFieldErrors('user.email');
		expect(errors.length).toStrictEqual(1);
		expect(errors[0].keyword).toStrictEqual('required');
	});

	it('should map multi-index array errors to dotted field paths', () => {
		// Real AJV 8 validation producing instancePath '/items/0/tags/1',
		// which must land on the field path 'items.0.tags.1'.
		const schema = {
			type: 'object',
			properties: {
				items: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							tags: {
								type: 'array',
								items: { type: 'string', minLength: 3 },
							},
						},
					},
				},
			},
		};

		const ref = React.createRef();
		render(
			<Form
				data={{ items: [{ tags: ['okay', 'x'] }] }}
				onSubmit={() => {}}
				ref={ref}
				schema={schema}
			/>,
		);

		const errors = ref.current.getFieldErrors('items.0.tags.1');
		expect(errors.length).toStrictEqual(1);
		expect(errors[0].keyword).toStrictEqual('minLength');
	});

	it('should accept a duck-typed validator through the ajv prop (no PropTypes error)', () => {
		// The `ajv` prop is duck-typed on `compile()` instead of
		// `instanceOf(Ajv)`, so alternative validator classes (Ajv2019,
		// Ajv2020…) are accepted. This fake instance also proves the fake's
		// compile() is really what runs.
		const compile = vi.fn(() => {
			const validate = () => true;
			validate.errors = null;
			return validate;
		});
		const fakeAjv = { compile };

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const ref = React.createRef();
		render(
			<Form
				ajv={fakeAjv}
				data={{ anything: 'goes' }}
				onSubmit={() => {}}
				ref={ref}
				schema={{ type: 'object' }}
			/>,
		);

		expect(compile).toHaveBeenCalledWith({ type: 'object' });
		expect(ref.current.state.valid).toBe(true);
		// No "Invalid prop `ajv`" PropTypes error was logged.
		expect(consoleErrorSpy).not.toHaveBeenCalled();
		consoleErrorSpy.mockRestore();
	});

	it('should reject a non-validator object passed as the ajv prop (PropTypes error)', () => {
		// The custom validator is exercised directly: PropTypes only warns,
		// so actually rendering with a broken instance would go on to crash
		// in `ajv.compile()` anyway. Reading propTypes is safe here — the
		// published build no longer strips them (see CHANGELOG).
		// eslint-disable-next-line react/forbid-foreign-prop-types
		const validator = Form.propTypes.ajv;

		const error = validator({ ajv: { notCompile: true } }, 'ajv', 'Form');
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toContain(
			'expected an AJV-like instance exposing a `compile()` function',
		);
		// The message names the received type to speed up debugging.
		expect(error.message).toContain('received object');
		expect(validator({ ajv: 42 }, 'ajv', 'Form').message).toContain('received number');

		// The prop stays optional…
		expect(validator({}, 'ajv', 'Form')).toBeNull();
		// …and any compile-capable object passes.
		expect(validator({ ajv: { compile: () => {} } }, 'ajv', 'Form')).toBeNull();
	});

	it('should log the PropTypes error through console.error when rendering with a broken ajv prop', () => {
		// End-to-end PropTypes proof: the warning is logged during render,
		// BEFORE the mount-time validation crashes in `ajv.compile()` — the
		// crash is expected (PropTypes only warns) and asserted as such.
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(() => {
			render(
				<Form
					ajv={42}
					onSubmit={() => {}}
					schema={{}}
				/>,
			);
		}).toThrow();

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('expected an AJV-like instance exposing a `compile()` function, received number'),
		);
		consoleErrorSpy.mockRestore();
	});

	it('should work with a real draft 2020-12 Ajv instance passed through the ajv prop', () => {
		const ajv2020 = new Ajv2020({ allErrors: true });
		const schema = {
			type: 'object',
			properties: {
				// prefixItems is a 2020-12 keyword: the default draft-07
				// instance would not apply it.
				pair: {
					type: 'array',
					prefixItems: [{ type: 'string' }, { type: 'number' }],
				},
			},
		};

		const ref = React.createRef();
		render(
			<Form
				ajv={ajv2020}
				data={{ pair: ['label', 'not-a-number'] }}
				onSubmit={() => {}}
				ref={ref}
				schema={schema}
			/>,
		);

		const errors = ref.current.getFieldErrors('pair.1');
		expect(errors.length).toStrictEqual(1);
		expect(errors[0].keyword).toStrictEqual('type');
	});
});

describe('revalidation on update', () => {
	// Wraps ajv.compile so every compiled validator counts its REAL
	// invocations — measures actual AJV work, not only validate() dispatches
	// (the memoized validator can short-circuit a dispatch without running
	// AJV, so the two counters answer different questions).
	const makeCountingAjv = () => {
		const ajv = createAjv();
		const counters = { compile: 0, run: 0 };
		const realCompile = ajv.compile.bind(ajv);
		ajv.compile = (schema) => {
			counters.compile += 1;
			const validate = realCompile(schema);
			/** @param {object} data */
			const wrapped = (data) => {
				counters.run += 1;
				const result = validate(data);
				wrapped.errors = validate.errors;
				return result;
			};
			wrapped.errors = null;
			return wrapped;
		};
		return { ajv, counters };
	};

	it('should not dispatch validation on internal state updates with unchanged props (touch, submit)', () => {
		const { ajv, counters } = makeCountingAjv();
		const onSubmit = vi.fn();
		const data = { type: 'te' };
		const ref = React.createRef();

		const { container } = render(
			<Form
				ajv={ajv}
				data={data}
				onSubmit={onSubmit}
				ref={ref}
				schema={testSchema}
				throttleDuration={0}
			/>,
		);

		// Mount validates once, unconditionally.
		expect(counters.run).toBe(1);

		const validateSpy = vi.spyOn(ref.current, 'validate');

		// touch: internal setState, no prop changed → no validate() dispatch.
		ref.current.touch('type');
		// FieldError registry bump: same story.
		ref.current.registerFieldError('key1', 'type', 'error-id-1');
		// Submit on a never-touched-then-touched valid form: isSubmitted
		// setState plus the default resetOnSubmit reset() — still no prop
		// change. `valid` was computed at mount, so onSubmit must fire.
		fireEvent.submit(container.querySelector('form'));

		expect(onSubmit).toHaveBeenCalled();
		// The guard skips the dispatch entirely…
		expect(validateSpy).not.toHaveBeenCalled();
		// …and no real AJV work happened either.
		expect(counters.run).toBe(1);
		expect(counters.compile).toBe(1);

		validateSpy.mockRestore();
	});

	it('should re-validate when the data reference changes', () => {
		const { ajv, counters } = makeCountingAjv();
		const ref = React.createRef();

		const formProps = {
			ajv,
			onSubmit: () => {},
			ref,
			schema: testSchema,
			throttleDuration: 0,
		};
		const { rerender } = render(<Form data={{ type: 'te' }} {...formProps} />);
		expect(counters.run).toBe(1);
		expect(ref.current.state.valid).toBe(true);

		// New data reference (nominal handleFieldChange → onChange → parent
		// setState path) → the validator runs again on the new data.
		rerender(<Form data={{ type: 'NOT_IN_ENUM' }} {...formProps} />);
		expect(counters.run).toBe(2);
		expect(ref.current.state.valid).toBe(false);
	});

	it('should re-compile and re-validate when the schema reference changes', () => {
		const { ajv, counters } = makeCountingAjv();
		const ref = React.createRef();

		const formProps = {
			ajv,
			data: { type: 'te' },
			onSubmit: () => {},
			ref,
			throttleDuration: 0,
		};
		const { rerender } = render(<Form schema={testSchema} {...formProps} />);
		expect(counters.compile).toBe(1);
		expect(counters.run).toBe(1);

		// New schema reference → new compiled validator, immediate run.
		rerender(<Form schema={{ ...testSchema, required: [] }} {...formProps} />);
		expect(counters.compile).toBe(2);
		expect(counters.run).toBe(2);
	});

	it('should re-validate when the ajv instance or throttleDuration changes', () => {
		const first = makeCountingAjv();
		const ref = React.createRef();

		const formProps = {
			data: { type: 'te' },
			onSubmit: () => {},
			ref,
			schema: testSchema,
		};
		const { rerender } = render(
			<Form ajv={first.ajv} throttleDuration={0} {...formProps} />,
		);
		expect(first.counters.run).toBe(1);

		// New AJV instance → validator rebuilt on it and run.
		const second = makeCountingAjv();
		rerender(<Form ajv={second.ajv} throttleDuration={0} {...formProps} />);
		expect(second.counters.compile).toBe(1);
		expect(second.counters.run).toBe(1);

		// New throttleDuration → throttled validator rebuilt and run.
		rerender(<Form ajv={second.ajv} throttleDuration={1} {...formProps} />);
		expect(second.counters.run).toBe(2);
		// The first instance was never touched again.
		expect(first.counters.run).toBe(1);
	});
});

it('should clean the event loop when unmounting', () => {
	const ref = React.createRef();
	const { unmount } = render(<Form onSubmit={() => {}} ref={ref} schema={{}} />);
	const componentWillUnmountSpy = vi.spyOn(Form.prototype, 'componentWillUnmount');
	const cancelSpy = vi.spyOn(ref.current.throttledValidator, 'cancel');
	unmount();
	expect(componentWillUnmountSpy).toHaveBeenCalled();
	expect(cancelSpy).toHaveBeenCalled();
	componentWillUnmountSpy.mockRestore();
	cancelSpy.mockRestore();
});
