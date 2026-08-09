import getErrorMessage from './getErrorMessage';
import { createAjv, formatErrors } from '../Form/helpers';

it('should return a message based on error keyword', () => {
	expect(getErrorMessage(
		{ keyword: 'err1' },
		{ err1: () => 'err1:message', err2: () => 'err2:message' },
	)).toBe('err1:message');
});

it('should call the error message function with the error as parameter', () => {
	const errMessage = vi.fn();
	const error = { keyword: 'err1' };
	getErrorMessage(error, { err1: errMessage });
	expect(errMessage).toHaveBeenCalledWith(error);
});

it('should call the default message function if no handler exists for this error', () => {
	const error = { keyword: 'err1' };
	const defaultMessage = vi.fn();
	getErrorMessage(error, { defaultMessage });
	expect(defaultMessage).toHaveBeenCalled();
});

it('should return the error.message if no handler exists for this error and no default message function is defined', () => {
	const error = { keyword: 'err1', message: 'err1:message:default' };
	expect(getErrorMessage(error)).toBe('err1:message:default');
});

// Issue #6: end-to-end — an error produced by the default AJV instance
// (verbose: true) reaches the errorMessages callback carrying `data`
// (the current value of the offending field), ready to interpolate.
it('should pass the current field value (error.data) to the errorMessages callback', () => {
	const ajv = createAjv();
	const validate = ajv.compile({
		type: 'object',
		properties: {
			name: { type: 'string', minLength: 5 },
		},
	});
	validate({ name: 'abc' });
	const [error] = formatErrors(validate.errors);

	const minLength = (e) => `"${e.data}" is too short (min ${e.params.limit})`;
	const message = getErrorMessage(error, { minLength });

	expect(message).toBe('"abc" is too short (min 5)');
});

// Regression: the debug flag branch used to reference `process.env` unguarded,
// which crashes in browser bundlers that don't polyfill `process` (Vite,
// esbuild, native ESM). The guard must survive `process` being undefined.
it('should not crash when `process` is undefined (browser bundlers without a Node polyfill)', () => {
	const originalProcess = global.process;
	// eslint-disable-next-line no-undef
	delete global.process;
	try {
		expect(() => getErrorMessage({ keyword: 'err1', message: 'boom' })).not.toThrow();
	} finally {
		global.process = originalProcess;
	}
});
