export default {
	Consumer: jest.fn().mockImplementation(props => props.children({
		getFieldErrors: jest.fn(() => []),
		isFieldInvalid: jest.fn(),
		isFieldTouched: jest.fn(),
		touch: jest.fn(),
	})),
};
