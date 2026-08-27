import { getErrorMessage } from './getErrorMessage';

const error = (code, extra = {}) => ({
	field: 'x', code, message: code.concat(':message'), params: {}, raw: null, ...extra,
});

it('should return a message based on the error code', () => {
	const messages = { err1: () => 'err1:custom', err2: () => 'err2:custom' };
	expect(getErrorMessage(error('err1'), messages)).toBe('err1:custom');
	expect(getErrorMessage(error('err2'), messages)).toBe('err2:custom');
});

it('should call the error message function with the normalized error as parameter', () => {
	const err1 = vi.fn(() => 'x');
	const e = error('err1', { params: { limit: 3 }, raw: { data: 'ab' } });
	getErrorMessage(e, { err1 });
	expect(err1).toHaveBeenCalledWith(e);
	expect(err1.mock.calls[0][0].raw.data).toBe('ab');
});

it('should call the default message function if no handler exists for this code', () => {
	const defaultMessage = vi.fn(() => 'default');
	expect(getErrorMessage(error('err1'), { err2: () => 'no', defaultMessage })).toBe('default');
	expect(defaultMessage).toHaveBeenCalledTimes(1);
});

it('should return the provider message if no handler nor default message exists', () => {
	expect(getErrorMessage(error('err1'), { err2: () => 'no' })).toBe('err1:message');
	expect(getErrorMessage(error('err1'), undefined)).toBe('err1:message');
});

it('should not crash when `process` is undefined (browser bundlers without a Node polyfill)', () => {
	const saved = global.process;
	// eslint-disable-next-line no-global-assign
	process = undefined;
	try {
		expect(getErrorMessage(error('err1'), {})).toBe('err1:message');
	} finally {
		// eslint-disable-next-line no-global-assign
		process = saved;
	}
});
