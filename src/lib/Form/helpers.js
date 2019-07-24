import Ajv from 'ajv';
import immutable from 'dot-prop-immutable';

/**
 * Returns a default Ajv instance
 */
export const createAjv = () => new Ajv({
	allErrors: true,
	v5: true,
	$data: true,
});

/**
 * Transforms an empty string or null to undefined
 * to allow usage of 'required' attribute in json schema.
 * Values undefined, null, or '' are equivalent in a form input.
 * @param {string} value
 */
export const empty = value => (
	(value === '' || value === null) ? undefined : value
);

/**
 * Formats data for Ajv validation
 * @param  {Object} data data to format
 * @returns {Object}      formatted data
 */
export const formatData = (data) => {
	if (data instanceof Array) {
		return data.map(formatData);
	}

	if (data === Object(data)) {
		const copy = {}; // Do not modify original object !

		// eslint-disable-next-line no-restricted-syntax,guard-for-in
		for (const key in data) {
			// Usage of for-in to validate inherited properties
			// Example : File.name
			copy[key] = formatData(data[key]);
		}

		data = copy;
	}

	// Allow usage of Ajv's 'required' keyword
	data = empty(data);

	return data;
};

/**
 * Add a property field to the error object
 * The field value can be used to find errors on the object
 * based on a normalized path
 * @param {Array} errors Array of Ajv's errors
 */
export const formatErrors = errors => (errors || []).map((error) => {
	error.field = error.dataPath;

	if (error.keyword === 'required') {
		error.field = `${error.field}.${error.params.missingProperty}`;
	}

	error.field = error.field
		.replace(/^\./, '')
		.replace(/\[([0-9]+)\]/, '.$1');

	return error;
});

/**
 * Filters an array of string matching the fieldName expression
 * fieldName expression can be :
 * - the exact name of a field
 * - or a prefix if fieldName expression ends with '*'
 * @param {[string]} fields
 * @param {string} fieldName
 */
export const filterByFieldNameWithWildcard = (fields, fieldName) => {
	let regex;
	if (/\*$/.test(fieldName)) {
		regex = new RegExp(`^${fieldName.replace(/\*$/, '')}`);
	}

	return fields.filter((e) => {
		if (regex) {
			return regex.test(e.field);
		}
		return e.field === fieldName;
	});
};

/**
 * Returns true if the checkbox is checked, false otherwise.
 * It checkbox is used to create array of checked values, you must
 * create your own change handler
 * @param {HTMLInputElement} target
 * @returns {boolean}
 */
export const getInputCheckboxValue = target => target.checked;

/**
 * Returns a file or an array of files if the attribute "multiple" is set.
 * @param {HTMLInputElement} target
 * @returns {string|File|File[]}
 */
export const getInputFileValue = (target) => {
	if (target.value === '') return target.value;
	return target.multiple ? Array.from(target.files) : target.files[0];
};

/**
 * Returns the input value as a number
 * @param {HTMLInputElement} target
 * @returns {string|Number}
 */
export const getInputNumberValue = target => (target.value !== '' ? +target.value : '');

/**
 * Returns a value from any type of input (text, checkbox, file...)
 * @param {Object} target - A target object from an event (ex: change)
 * @returns {Object} Typed value of target
 */
export const getFieldValue = (target) => {
	switch (target.type) {
	case 'number':
		return getInputNumberValue(target);
	case 'checkbox':
		return getInputCheckboxValue(target);
	case 'file':
		return getInputFileValue(target);
	default:
		return target.value;
	}
};

/**
 * Copy the data object and modify the updated values coming from events
 * It uses the 'dot-prop-immutable' module to change object references of each nested object
 * which contains a property that changed.
 * @param {Object} data - The original data object
 * @param {SyntheticEvent|SyntheticEvent[]} events - A single event or an array of events
 * @returns {Object} A copy of the data object if modified or data
 */
export const updateDataFromEvents = (data, events) => {
	if (!events) return data;
	if (!Array.isArray(events)) events = [events];

	events.forEach((event) => {
		data = immutable.set(data, event.target.name, getFieldValue(event.target));
	});

	return data;
};
