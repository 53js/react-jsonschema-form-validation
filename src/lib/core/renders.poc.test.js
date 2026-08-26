/**
 * POC criterion 5: render counts per keystroke with `memo` + selector-based
 * subscriptions.
 *
 * 0.x baseline for the same layout (3 Field + 3 FieldError, parent holding
 * `data` in useState): every keystroke re-rendered all 6 consumers TWICE —
 * once with the parent (new context value from the Form render), once
 * more when the validation result landed (setState in componentDidUpdate).
 * A blur (touch) re-rendered all 6 once.
 */
import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react';

import { Form, Field, FieldError } from '..';

const schema = {
	type: 'object',
	properties: {
		a: { type: 'string', minLength: 3 },
		b: { type: 'string', minLength: 3 },
		c: { type: 'string', minLength: 3 },
	},
};

// Inner renders: <Field> / <FieldError> render their `component` exactly
// once per render of their own (FieldError renders nothing without an
// error, so its probe only counts renders WITH an error displayed).
const innerCounts = {};
const bump = (label) => { innerCounts[label] = (innerCounts[label] || 0) + 1; };
const InputProbe = React.forwardRef(({ label, ...rest }, ref) => {
	bump(label);
	return <input ref={ref} {...rest} />;
});
const DivProbe = ({ label, ...rest }) => {
	bump(label);
	return <div {...rest} />;
};

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

const LABELS = ['Field:a', 'Field:b', 'Field:c', 'Error:a', 'Error:b', 'Error:c'];
const snapshot = () => Object.fromEntries(LABELS.map((l) => [l, innerCounts[l] || 0]));
const delta = (x, y) => Object.fromEntries(LABELS.map((l) => [l, y[l] - x[l]]));

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

	step('blur a (touch only, no data change)', () => fireEvent.blur(inputA));
	step('keystroke 1 (a: valid → invalid)', () => fireEvent.change(inputA, { target: { name: 'a', value: 'x' } }));
	step('keystroke 2 (a: invalid → invalid, same error)', () => fireEvent.change(inputA, { target: { name: 'a', value: 'xy' } }));
	step('keystroke 3 (a: invalid → valid)', () => fireEvent.change(inputA, { target: { name: 'a', value: 'xyz' } }));

	// eslint-disable-next-line no-console
	console.log(`\nRender counts per interaction (App = parent holding data):\n${JSON.stringify(report, null, 2)}\n`);

	// Touch: only Field:a (isTouched changed). 0.x: all 6.
	expect(report['blur a (touch only, no data change)']).toEqual({
		'Field:a': 1, 'Field:b': 0, 'Field:c': 0, 'Error:a': 0, 'Error:b': 0, 'Error:c': 0, App: 0,
	});
	// Keystroke 1: the parent re-renders (its own state), Field b/c and
	// Error b/c are memo'd with equal props → bail out; Field:a and Error:a
	// re-render once when the validation result lands. 0.x: 6 × 2.
	expect(report['keystroke 1 (a: valid → invalid)']).toEqual({
		'Field:a': 1, 'Field:b': 0, 'Field:c': 0, 'Error:a': 1, 'Error:b': 0, 'Error:c': 0, App: 1,
	});
	// Keystroke 2: same error → nothing but the parent. 0.x: 6 × 2.
	expect(report['keystroke 2 (a: invalid → invalid, same error)']).toEqual({
		'Field:a': 0, 'Field:b': 0, 'Field:c': 0, 'Error:a': 0, 'Error:b': 0, 'Error:c': 0, App: 1,
	});
	// Keystroke 3: Field:a re-renders (isInvalid), Error:a renders null.
	expect(report['keystroke 3 (a: invalid → valid)']).toEqual({
		'Field:a': 1, 'Field:b': 0, 'Field:c': 0, 'Error:a': 0, 'Error:b': 0, 'Error:c': 0, App: 1,
	});
});
