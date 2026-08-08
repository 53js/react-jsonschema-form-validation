import React from 'react';
import { render } from '@testing-library/react';

import FormContext, { useFormContext, withFormContext } from './Context';

describe('FormContext', () => {
	it('should be a React Context', () => {
		expect(FormContext.Provider).toBeDefined();
		expect(FormContext.Consumer).toBeDefined();
	});
});

describe('useFormContext', () => {
	it('should match snapshot', () => {
		const UseContextComponent = () => {
			const context = useFormContext();
			return <span>{context}</span>;
		};
		const { container } = render(
			<FormContext.Provider value="FormContextSnapshot">
				<UseContextComponent />
			</FormContext.Provider>,
		);
		expect(container.firstChild).toMatchSnapshot();
	});
});

describe('withFormContext', () => {
	it('should match snapshot', () => {
		const WithContextComponent = () => withFormContext((context) => <span>{context}</span>);
		const { container } = render(
			<FormContext.Provider value="FormContextSnapshot">
				<WithContextComponent />
			</FormContext.Provider>,
		);
		expect(container.firstChild).toMatchSnapshot();
	});
});
