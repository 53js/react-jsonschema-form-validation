/**
 * @import { FormError } from './errors'
 * @import { ErrorMessagesMap } from './types'
 */

/**
 * Find the error message to display when a field is invalid.
 *
 * Resolution priority (highest first):
 *   1. The message for `error.code` in the map passed to `<FieldError>`
 *   2. The message for `error.code` in the map passed to the form
 *   3. The `defaultMessage` catch-all
 *   4. The provider's own message
 *
 * @param {FormError} error
 * @param {ErrorMessagesMap | undefined} errorMessages Already merged (form-level
 *   then field-level overrides).
 * @returns {string | undefined}
 */
export const getErrorMessage = (error, errorMessages) => {
	const customErrorMessage = errorMessages
		&& (errorMessages[error.code] || errorMessages.defaultMessage);

	let message = customErrorMessage ? customErrorMessage(error) : error.message;

	/* istanbul ignore next -- @preserve */
	if (typeof process !== 'undefined' && process?.env?.REACT_APP_JFV_DEBUG === 'true') {
		message += ` [#${error.code}]`;
	}

	return message;
};
