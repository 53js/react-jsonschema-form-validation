/**
 * Structural equality for form data and normalized errors.
 *
 * Policy: plain objects (prototype `Object.prototype` or `null`) and arrays
 * are compared recursively; everything else — `File`, `Date`, class
 * instances, functions — by `Object.is`. Validation is a pure function of
 * `(schema, data)`, so skipping a run on deep-equal data skips only work
 * that would produce the same result; and a `<FieldError>` re-renders
 * exactly when its first error differs in any way (`params`, `raw.data`…).
 */

/**
 * @param {object} value
 * @returns {boolean}
 */
const isPlainObject = (value) => {
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
};

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export const deepEqual = (a, b) => {
	if (Object.is(a, b)) return true;
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
	const arrayA = Array.isArray(a);
	if (arrayA !== Array.isArray(b)) return false;
	if (arrayA) {
		const listA = /** @type {unknown[]} */ (a);
		const listB = /** @type {unknown[]} */ (b);
		return listA.length === listB.length
			&& listA.every((item, index) => deepEqual(item, listB[index]));
	}
	if (!isPlainObject(a) || !isPlainObject(b)) return false;
	const recordA = /** @type {Record<string, unknown>} */ (a);
	const recordB = /** @type {Record<string, unknown>} */ (b);
	const keysA = Object.keys(recordA);
	const keysB = Object.keys(recordB);
	return keysA.length === keysB.length
		&& keysA.every((key) => Object.prototype.hasOwnProperty.call(recordB, key)
			&& deepEqual(recordA[key], recordB[key]));
};
