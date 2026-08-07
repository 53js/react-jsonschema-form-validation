import React from 'react';

const context = {
	formId: 'jfv1',
	getFieldErrorDescribedBy: jest.fn(),
	getFieldErrors: jest.fn(() => []),
	handleFieldChange: jest.fn(),
	isFieldInvalid: jest.fn(),
	isFieldTouched: jest.fn(),
	registerFieldError: jest.fn(),
	reset: jest.fn(),
	touch: jest.fn(),
	unregisterFieldError: jest.fn(),
};

const Consumer = jest.fn().mockImplementation((props) => props.children(context));

export default {
	Consumer,
};

export const withFormContext = jest.fn().mockImplementation((cb) => <Consumer>{cb}</Consumer>);
