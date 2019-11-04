import React from 'react';
import { mount } from 'enzyme';

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
		const wrapper = mount(
			<FormContext.Provider value="FormContextSnapshot">
				<UseContextComponent />
			</FormContext.Provider>,
		);
		expect(wrapper).toMatchSnapshot();
	});
});

describe('withFormContext', () => {
	it('should match snapshot', () => {
		const WithContextComponent = () => withFormContext((context) => <span>{context}</span>);
		const wrapper = mount(
			<FormContext.Provider value="FormContextSnapshot">
				<WithContextComponent />
			</FormContext.Provider>,
		);
		expect(wrapper).toMatchSnapshot();
	});
});
