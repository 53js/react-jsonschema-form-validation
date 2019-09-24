import React from 'react';

const context = {
	getFieldErrors: jest.fn(() => []),
	handleFieldChange: jest.fn(),
	isFieldInvalid: jest.fn(),
	isFieldTouched: jest.fn(),
	touch: jest.fn(),
};

const Consumer = jest.fn().mockImplementation((props) => props.children(context));

export default {
	Consumer,
};

export const withContext = jest.fn().mockImplementation((cb) => <Consumer>{cb}</Consumer>);
