/**
 * [getErrorMessage find the error message to display when a field is invalid]
 * @param  {Object} fieldError           [The AJV error object]
 * @param  {Object} errorMessages   	 [The complete list of error messages]
 * @return {string}                      [return the error message]
 *
 * Message displayed priority :
 *  1. The correponding error message passed by the FieldError component
 *  2. The correponding error message passed by the Form component or
 *  3. The default message passed by the Form component
 *  4. The AJV message if noting is passed
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
