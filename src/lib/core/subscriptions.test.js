/**
 * Render counts per interaction with `memo` + selector-based subscriptions
 * (RFC 0001 "Subscription model"). 0.x baseline for the same layout: every
 * consumer re-rendered twice per keystroke (parent render + validation
 * setState) and all six once per blur.
 */
import React, { useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';

import { ajvSchema } from '../providers/ajv';
import { Form } from './Form';
import { Field } from './Field';
import { FieldError } from './FieldError';
import { useFormSelector } from './useFormSelector';
import { FormContext, useFormContext } from './Context';

const schema = ajvSchema({
	type: 'object',
	properties: {
		a: { type: 'string', minLength: 3 },
		b: { type: 'string', minLength: 3 },
		c: { type: 'string', minLength: 3 },
	},
});

const LABELS = ['Field:a', 'Field:b', 'Field:c', 'Error:a', 'Error:b', 'Error:c'];
let innerCounts = {};
const bump = (label) => { innerCounts[label] = (innerCounts[label] || 0) + 1; };
const InputProbe = React.forwardRef(({ label, ...rest }, ref) => {
	bump(label);
	return <input ref={ref} {...rest} />;
});
const DivProbe = ({ label, ...rest }) => { bump(label); return <div {...rest} />; };

let appRenders = 0;
const App = () => {
	appRenders += 1;
	const [data, setData] = useState({ a: '', b: '', c: '' });
	return (
		<Form data={data} onChange={setData} onSubmit={() => {}} schema={schema} throttleDuration={0}>
			{['a', 'b', 'c'].map((name) => (
				<React.Fragment key={name}>
					<Field name={name} component={InputProbe} label={`Field:${name}`} />
					<FieldError name={name} component={DivProbe} label={`Error:${name}`} />
				</React.Fragment>
			))}
		</Form>
	);
};

const snapshot = () => Object.fromEntries(LABELS.map((l) => [l, innerCounts[l] || 0]));
const delta = (x, y) => Object.fromEntries(LABELS.map((l) => [l, y[l] - x[l]]));

beforeEach(() => { innerCounts = {}; appRenders = 0; });

it('re-renders only the subscribers whose selection changed', () => {
	const { container } = render(<App />);
	const inputA = container.querySelector('input[name="a"]');
	const report = {};
	let before = snapshot();
	const step = (label, action) => {
		const appBefore = appRenders;
		action();
		const after = snapshot();
		report[label] = { ...delta(before, after), App: appRenders - appBefore };
		before = after;
	};

	step('blur', () => fireEvent.blur(inputA));
	step('k1', () => fireEvent.change(inputA, { target: { name: 'a', value: 'x' } }));
	step('k2', () => fireEvent.change(inputA, { target: { name: 'a', value: 'xy' } }));
	step('k3', () => fireEvent.change(inputA, { target: { name: 'a', value: 'xyz' } }));

	// Touch: only Field:a (isTouched changed).
	expect(report.blur).toEqual({
		'Field:a': 1, 'Field:b': 0, 'Field:c': 0, 'Error:a': 0, 'Error:b': 0, 'Error:c': 0, App: 0,
	});
	// Keystroke 1 (valid → invalid): the parent re-renders; memo bails the
	// untouched fields out; Field:a and Error:a re-render once when the
	// validation result lands.
	expect(report.k1).toEqual({
		'Field:a': 1, 'Field:b': 0, 'Field:c': 0, 'Error:a': 1, 'Error:b': 0, 'Error:c': 0, App: 1,
	});
	// Keystroke 2 (same error code, new value): Field:a's selection is
	// unchanged; Error:a re-renders because the error differs structurally
	// (raw.data — a message callback may display it).
	expect(report.k2).toEqual({
		'Field:a': 0, 'Field:b': 0, 'Field:c': 0, 'Error:a': 1, 'Error:b': 0, 'Error:c': 0, App: 1,
	});
	// Keystroke 3 (invalid → valid): Field:a re-renders, Error:a renders null.
	expect(report.k3).toEqual({
		'Field:a': 1, 'Field:b': 0, 'Field:c': 0, 'Error:a': 0, 'Error:b': 0, 'Error:c': 0, App: 1,
	});
});

it('coarse useFormContext() consumers do not affect the fields\' render counts', () => {
	let consumerRenders = 0;
	// memo: parent-driven renders are not what is measured here.
	const Consumer = React.memo(() => {
		consumerRenders += 1;
		const { valid } = useFormContext();
		return <output>{String(valid)}</output>;
	});
	const AppWithConsumer = () => {
		const [data, setData] = useState({ a: '', b: '', c: '' });
		return (
			<Form data={data} onChange={setData} onSubmit={() => {}} schema={schema} throttleDuration={0}>
				<Field name="a" component={InputProbe} label="Field:a" />
				<Field name="b" component={InputProbe} label="Field:b" />
				<FieldError name="b" component={DivProbe} label="Error:b" />
				<Consumer />
			</Form>
		);
	};
	const { container } = render(<AppWithConsumer />);
	const before = snapshot();
	fireEvent.change(container.querySelector('input[name="a"]'), { target: { name: 'a', value: 'x' } });
	expect(consumerRenders).toBe(2);
	expect(container.querySelector('output').textContent).toBe('false');
	const after = snapshot();
	expect(after['Field:b'] - before['Field:b']).toBe(0);
	expect(after['Error:b'] - before['Error:b']).toBe(0);
});

describe('useFormSelector', () => {
	it('re-renders a consumer only when its selection changes (default shallow equality)', () => {
		let renders = 0;
		let form;
		const Probe = () => {
			// Raw context: no coarse subscription, only the selector below.
			form = React.useContext(FormContext);
			const { touched } = useFormSelector(form, (s) => ({ touched: s.touchedFields.length }));
			renders += 1;
			return <output>{touched}</output>;
		};
		const { container } = render(
			<Form onSubmit={() => {}} schema={schema} data={{ a: '' }}>
				<Probe />
			</Form>,
		);
		expect(renders).toBe(1);
		fireEvent.submit(container.querySelector('form'));
		expect(renders).toBe(1);
		act(() => form.touch('a'));
		expect(renders).toBe(2);
		expect(container.querySelector('output').textContent).toBe('1');
	});

	it('re-renders on a primitive selection change (default equality is identity for primitives)', () => {
		let form;
		const Probe = () => {
			form = React.useContext(FormContext);
			const count = useFormSelector(form, (s) => s.touchedFields.length);
			return <output>{count}</output>;
		};
		const { container } = render(<Form onSubmit={() => {}} schema={schema}><Probe /></Form>);
		expect(container.querySelector('output').textContent).toBe('0');
		act(() => form.touch('a'));
		expect(container.querySelector('output').textContent).toBe('1');
		act(() => form.touch('b'));
		expect(container.querySelector('output').textContent).toBe('2');
	});

	it('accepts a custom equality function', () => {
		let renders = 0;
		let form;
		const Probe = () => {
			form = React.useContext(FormContext);
			useFormSelector(form, (s) => s.touchedFields, () => true);
			renders += 1;
			return null;
		};
		render(<Form onSubmit={() => {}} schema={schema}><Probe /></Form>);
		act(() => form.touch('a'));
		expect(renders).toBe(1);
	});
});
