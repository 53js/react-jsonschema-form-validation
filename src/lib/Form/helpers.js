import Ajv from 'ajv';

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
 * @return {Object}      formatted data
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
