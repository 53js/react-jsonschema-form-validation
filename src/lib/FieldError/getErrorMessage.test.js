import getErrorMessage from './getErrorMessage';

it('should return a message based on error keyword', () => {
	expect(getErrorMessage(
		{ keyword: 'err1' },
		{ err1: () => 'err1:message', err2: () => 'err2:message' },
	)).toBe('err1:message');
});

it('should call the error message function with the error as parameter', () => {
	const errMessage = jest.fn();
	const error = { keyword: 'err1' };
	getErrorMessage(error, { err1: errMessage });
	expect(errMessage).toHaveBeenCalledWith(error);
});

it('should call the default message function if no handler exists for this error', () => {
	const error = { keyword: 'err1' };
	const defaultMessage = jest.fn();
	getErrorMessage(error, { defaultMessage });
	expect(defaultMessage).toHaveBeenCalled();
});

it('should return the error.message if no handler exists for this error and no default message function is defined', () => {
	const error = { keyword: 'err1', message: 'err1:message:default' };
	expect(getErrorMessage(error)).toBe('err1:message:default');
});
