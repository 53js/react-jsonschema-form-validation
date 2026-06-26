/**
 * @import { FormattedError } from '../Form/helpers'
 * @import { ErrorMessagesMap } from '../Form/Context'
 */

/**
 * Find the error message to display when a field is invalid.
 *
 * Resolution priority (highest first):
 *   1. The corresponding message factory passed to `<FieldError>` as a prop
 *   2. The corresponding message factory passed to `<Form>` as a prop
 *   3. The `defaultMessage` factory passed to `<Form>` (catch-all)
 *   4. The raw AJV message
 *
 * @param {FormattedError} fieldError
 * @param {ErrorMessagesMap | undefined} errorMessages
 * @returns {string | undefined}
 */
const getErrorMessage = (fieldError, errorMessages) => {
	// customMessage = the errorMessage provided by the <FieldError> as props
	// or the message passed as props to the <Form> as props
	const customErrorMessage = errorMessages
		&& (errorMessages[fieldError.keyword] || errorMessages.defaultMessage);

	let message = customErrorMessage ? customErrorMessage(fieldError) : fieldError.message;

	/* istanbul ignore next */
	if (process.env.REACT_APP_JFV_DEBUG === 'true') {
		message += ` [#${fieldError.keyword}]`;
	}

	return message;
};

export default getErrorMessage;
