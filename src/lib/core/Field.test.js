import React, { useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';

import { ajvSchema } from '../providers/ajv';
import { Form } from './Form';
import { Field } from './Field';
import { FieldError } from './FieldError';
import { useForm } from './useForm';
import { useFormContext } from './Context';

const schema = ajvSchema({
	type: 'object',
	properties: { username: { type: 'string', minLength: 3 } },
	required: ['username'],
});

const Capture = ({ onForm }) => { onForm(useFormContext()); return null; };
const renderField = (fieldProps = {}, formProps = {}) => {
	let form;
	const utils = render(
		<Form id="f" onSubmit={() => {}} schema={schema} {...formProps}>
			<Capture onForm={(f) => { form = f; }} />
			<Field name="username" {...fieldProps} />
		</Form>,
	);
	return { ...utils, form: () => form, input: () => utils.container.querySelector('[name="username"]') };
};

it('should match snapshot', () => {
	const { input } = renderField();
	expect(input()).toMatchSnapshot();
});

describe('association', () => {
	it('should throw outside a <Form> without a form prop', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => render(<Field name="a" />)).toThrow(/<Field> must be rendered inside a <Form>/);
		spy.mockRestore();
	});

	it('should prefer the explicit form prop over the nearest <Form>', () => {
		const Two = () => {
			const outer = useForm({ schema, id: 'outer' });
			const inner = useForm({ schema, id: 'inner' });
			return (
				<Form form={outer} onSubmit={() => {}}>
					<Field name="username" form={inner} />
				</Form>
			);
		};
		const { container } = render(<Two />);
		expect(container.querySelector('input').getAttribute('form')).toBe('inner');
	});

	it('should set the native form attribute on form-associable elements only', () => {
		const { container } = render(
			<Form id="f" onSubmit={() => {}} schema={schema}>
				<Field name="a" component="select" />
				<Field name="b" component="textarea" />
				<Field name="c" component="div" />
				<Field name="d" component={(props) => <span data-form={String(props.form)} />} />
			</Form>,
		);
		expect(container.querySelector('select').getAttribute('form')).toBe('f');
		expect(container.querySelector('textarea').getAttribute('form')).toBe('f');
		expect(container.querySelector('div[name="c"]').hasAttribute('form')).toBe(false);
		expect(container.querySelector('span').getAttribute('data-form')).toBe('undefined');
	});
});

describe('handlers', () => {
	it('should touch the field on blur, then call the user onBlur', () => {
		const onBlur = vi.fn();
		const { form, input } = renderField({ onBlur });
		fireEvent.blur(input());
		expect(form().isFieldTouched('username')).toBe(true);
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it('should push DOM change events into the form data', () => {
		const onChange = vi.fn();
		const { input } = renderField({}, { data: { username: '' }, onChange });
		fireEvent.change(input(), { target: { name: 'username', value: 'hugo' } });
		expect(onChange).toHaveBeenCalledWith({ username: 'hugo' }, expect.objectContaining({ target: expect.anything() }));
	});

	it('should let a user onChange take over, receiving the form handler as second argument', () => {
		const onChange = vi.fn();
		const formOnChange = vi.fn();
		const { input, form } = renderField({ onChange }, { data: { username: '' }, onChange: formOnChange });
		fireEvent.change(input(), { target: { name: 'username', value: 'x' } });
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0][1]).toBe(form().handleFieldChange);
		expect(formOnChange).not.toHaveBeenCalled();
	});

	it('should wrap raw values emitted by non-DOM components into a synthetic event', () => {
		const onChange = vi.fn();
		const Raw = ({ onChange: emit }) => <button type="button" onClick={() => emit({ value: 'x', label: 'X' })}>emit</button>;
		const RawString = ({ onChange: emit }) => <button type="button" onClick={() => emit('str')}>emit</button>;
		const { container } = render(
			<Form onSubmit={() => {}} schema={schema} data={{}} onChange={onChange}>
				<Field name="obj" component={Raw} />
				<Field name="str" component={RawString} />
			</Form>,
		);
		const [objButton, strButton] = container.querySelectorAll('button');
		fireEvent.click(objButton);
		expect(onChange).toHaveBeenLastCalledWith({ obj: { value: 'x', label: 'X' } }, { target: { name: 'obj', value: { value: 'x', label: 'X' } } });
		fireEvent.click(strButton);
		expect(onChange).toHaveBeenLastCalledWith({ str: 'str' }, { target: { name: 'str', value: 'str' } });
	});

	it('should pass a raw value straight through to a user onChange without wrapping', () => {
		const onChange = vi.fn();
		const RawString = ({ onChange: emit }) => <button type="button" onClick={() => emit('str')}>emit</button>;
		const { container } = render(
			<Form onSubmit={() => {}} schema={schema}>
				<Field name="str" component={RawString} onChange={onChange} />
			</Form>,
		);
		fireEvent.click(container.querySelector('button'));
		expect(onChange.mock.calls[0][0]).toBe('str');
	});
});

describe('classnames and ARIA', () => {
	it('should reflect isTouched / isInvalid / isSubmitted and gate aria-invalid on reveal', () => {
		const { input, container } = renderField({}, { data: { username: 'ab' } });
		expect(input().className).toBe('Jfv_Field isInvalid');
		expect(input().getAttribute('aria-invalid')).toBeNull();
		fireEvent.blur(input());
		expect(input().className).toBe('Jfv_Field isInvalid isTouched');
		expect(input().getAttribute('aria-invalid')).toBe('true');
		fireEvent.submit(container.querySelector('form'));
		expect(input().className).toBe('Jfv_Field isInvalid isSubmitted isTouched');
	});

	it('should not render aria-invalid on a valid field, even touched', () => {
		const { input } = renderField({}, { data: { username: 'hugo' } });
		fireEvent.blur(input());
		expect(input().getAttribute('aria-invalid')).toBeNull();
	});

	it('should allow to override aria-invalid, and merge a user aria-describedby before the error ids', () => {
		const { container } = render(
			<Form id="f" onSubmit={() => {}} schema={schema} data={{ username: 'ab' }}>
				<Field name="username" aria-invalid="false" aria-describedby="hint" />
				<FieldError name="username" />
			</Form>,
		);
		const input = () => container.querySelector('input');
		expect(input().getAttribute('aria-invalid')).toBe('false');
		expect(input().getAttribute('aria-describedby')).toBe('hint');
		fireEvent.submit(container.querySelector('form'));
		expect(input().getAttribute('aria-describedby')).toBe('hint f-error-username');
	});

	it('should keep a custom className and forward extra props', () => {
		const { input } = renderField({ className: 'form-control', placeholder: 'x', type: 'email' }, { data: { username: 'hugo' } });
		expect(input().className).toBe('Jfv_Field form-control');
		expect(input().getAttribute('placeholder')).toBe('x');
		expect(input().type).toBe('email');
	});
});

describe('re-rendering', () => {
	it('should bail out of parent re-renders with equal props (memo) and re-render only on its own state', () => {
		let renders = 0;
		const Probe = React.forwardRef((props, ref) => {
			renders += 1;
			return <input ref={ref} {...props} />;
		});
		const Parent = () => {
			const [data, setData] = useState({ username: 'hugo', other: '' });
			return (
				<Form
					onSubmit={() => {}}
					schema={schema}
					data={data}
					onChange={setData}
					throttleDuration={0}
				>
					<Field name="username" component={Probe} />
					<Field name="other" />
				</Form>
			);
		};
		const { container } = render(<Parent />);
		expect(renders).toBe(1);
		fireEvent.change(container.querySelector('input[name="other"]'), { target: { name: 'other', value: 'x' } });
		expect(renders).toBe(1);
		fireEvent.blur(container.querySelector('input[name="username"]'));
		expect(renders).toBe(2);
	});

	it('should forward the ref to the underlying element', () => {
		const ref = React.createRef();
		renderField({ ref });
		expect(ref.current).toBeInstanceOf(HTMLInputElement);
		expect(ref.current.name).toBe('username');
	});

	it('should follow the touched state set imperatively through the api', () => {
		const { form, input } = renderField();
		act(() => form().touch('username'));
		expect(input().classList.contains('isTouched')).toBe(true);
	});
});
