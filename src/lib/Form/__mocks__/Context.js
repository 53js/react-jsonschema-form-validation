import React from 'react';
import { vi } from 'vitest';

const context = {
	formId: 'jfv1',
	getFieldErrorDescribedBy: vi.fn(),
	getFieldErrors: vi.fn(() => []),
	handleFieldChange: vi.fn(),
	isFieldInvalid: vi.fn(),
	isFieldTouched: vi.fn(),
	registerFieldError: vi.fn(),
	reset: vi.fn(),
	touch: vi.fn(),
	unregisterFieldError: vi.fn(),
};

const Consumer = vi.fn().mockImplementation((props) => props.children(context));

export default {
	Consumer,
};

export const withFormContext = vi.fn().mockImplementation((cb) => <Consumer>{cb}</Consumer>);
