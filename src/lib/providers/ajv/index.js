/**
 * AJV provider: wraps a JSON Schema into a Standard Schema v1 object, so
 * `useForm({ schema: ajvSchema(jsonSchema) })` speaks the same protocol as
 * Zod / Valibot / ArkType. Ships as its own entry
 * (`react-jsonschema-form-validation/providers/ajv`) so consumers of other
 * providers never bundle AJV.
 *
 * @import { ErrorObject } from 'ajv'
 * @import { JSONSchema7Definition } from 'json-schema'
 * @import { StandardSchema } from '../../core/standard-schema'
 * @import { ProviderIssue } from '../../core/errors'
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * An AJV `ErrorObject` enriched with a `field` property — the dot-path of
 * the offending field. Kept for the 0.x `formatErrors` compatibility
 * surface; `raw` on a normalized `FormError` carries this object.
 *
 * @typedef {ErrorObject & { dataPath?: string, field: string }} FormattedError
 */

/**
 * Anything exposing `compile(schema)` — the library never relies on the
 * exact Ajv class (Ajv2019/Ajv2020 instances are fine).
 *
 * @typedef {{
 *   compile: (schema: any) =>
 *     ((data: unknown) => boolean | Promise<unknown>) & { errors?: ErrorObject[] | null },
 * }} AjvLike
 */

/**
 * Returns a default AJV (v8) instance configured for use with the form:
 * `allErrors`, `$data`, `strict: false`, `ajv-formats`, and `verbose`
 * (issue #6: `error.data` carries the current value of the offending
 * field — reachable as `raw.data` on the normalized error).
 *
 * @returns {Ajv}
 */
export const createAjv = () => {
	const ajv = new Ajv({
		allErrors: true,
		$data: true,
		strict: false,
		verbose: true,
	});
	addFormats(ajv);
	return ajv;
};

/** @type {Ajv | undefined} */
let defaultAjv;
const getDefaultAjv = () => {
	if (!defaultAjv) defaultAjv = createAjv();
	return defaultAjv;
};

/**
 * Normalizes empty form values: `''` and `null` become `undefined` so the
 * JSON Schema `required` keyword treats them as missing.
 *
 * @template T
 * @param {T} value
 * @returns {T | undefined}
 */
export const empty = (value) => {
	const v = /** @type {unknown} */ (value);
	return v === '' || v === null ? undefined : value;
};

/**
 * Recursively applies `empty()` to every leaf of `data`, never mutating.
 *
 * @template T
 * @param {T} data
 * @returns {T | undefined}
 */
export const formatData = (data) => {
	if (Array.isArray(data)) {
		return /** @type {T} */ (data.map(formatData));
	}
	if (data !== null && typeof data === 'object') {
		/** @type {Record<string, unknown>} */
		const copy = {};
		const obj = /** @type {Record<string, unknown>} */ (data);
		// eslint-disable-next-line no-restricted-syntax, guard-for-in
		for (const key in obj) {
			copy[key] = formatData(obj[key]);
		}
		return /** @type {T} */ (copy);
	}
	return empty(data);
};

/**
 * RFC 6901 §4: `~1` must be decoded before `~0`.
 *
 * @param {string} segment
 */
const unescapePointerSegment = (segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~');

/**
 * JSON Pointer (AJV 8 `instancePath`, e.g. `/items/0/label`) → segments.
 *
 * @param {string} pointer
 * @returns {string[]}
 */
export const pointerToSegments = (pointer) => (
	pointer === '' ? [] : pointer.split('/').slice(1).map(unescapePointerSegment)
);

/**
 * Legacy AJV 6 `dataPath` (`.items[0].label`) → segments.
 *
 * @param {string} dataPath
 * @returns {string[]}
 */
const dataPathToSegments = (dataPath) => {
	const normalized = dataPath.replace(/^\./, '').replace(/\[([0-9]+)\]/g, '.$1');
	return normalized === '' ? [] : normalized.split('.');
};

/**
 * JSON Pointer → dot-separated field path (`'items.0.label'`).
 *
 * @param {string} pointer
 * @returns {string}
 */
export const pointerToFieldPath = (pointer) => pointerToSegments(pointer).join('.');

/**
 * Path segments of an AJV error: `instancePath` (AJV 8, JSON Pointer) when
 * present, legacy `dataPath` (AJV 6) otherwise; `required` errors point at
 * the missing property itself.
 *
 * @param {ErrorObject & { dataPath?: string }} error
 * @returns {string[]}
 */
export const errorToSegments = (error) => {
	const segments = typeof error.instancePath === 'string'
		? pointerToSegments(error.instancePath)
		: dataPathToSegments(error.dataPath ?? '');
	if (error.keyword === 'required' && 'missingProperty' in error.params) {
		return [...segments, String(error.params.missingProperty)];
	}
	return segments;
};

/**
 * 0.x compatibility: enriches each AJV error with its `field` dot-path
 * (in place, as before).
 *
 * @param {ErrorObject[] | null | undefined} errors
 * @returns {FormattedError[]}
 */
export const formatErrors = (errors) => (errors || []).map((error) => {
	const formatted = /** @type {FormattedError} */ (error);
	formatted.field = errorToSegments(formatted).join('.');
	return formatted;
});

/**
 * AJV keyword → normalized code (RFC 0001). Everything else passes through
 * under its own keyword (`oneOf`, `multipleOf`, `uniqueItems`, `minItems`…).
 *
 * @type {Record<string, string>}
 */
export const AJV_CODE_MAP = {
	minimum: 'min',
	exclusiveMinimum: 'min',
	maximum: 'max',
	exclusiveMaximum: 'max',
};

/**
 * @param {ErrorObject} error
 * @returns {ProviderIssue}
 */
export const errorToIssue = (error) => ({
	message: error.message ?? '',
	path: errorToSegments(error),
	code: AJV_CODE_MAP[error.keyword] ?? error.keyword,
	params: error.params,
	raw: error,
});

/**
 * Wraps a JSON Schema into a Standard Schema object backed by AJV.
 * Compiles once; the returned object is meant to be memoized by the caller
 * (the root entry does it per `(schema, ajv)` pair).
 *
 * @template [T = unknown]
 * @param {JSONSchema7Definition} schema
 * @param {{ ajv?: AjvLike }} [options]
 * @returns {StandardSchema<T> & { jsonSchema: JSONSchema7Definition }}
 */
export const ajvSchema = (schema, options = {}) => {
	const ajv = options.ajv ?? getDefaultAjv();
	if (!ajv || typeof ajv.compile !== 'function') {
		throw new Error(
			'react-jsonschema-form-validation: `ajv` must be an AJV-like instance exposing '
			+ `a compile(schema) function, received ${typeof ajv}.`,
		);
	}
	const validate = ajv.compile(schema);
	return {
		jsonSchema: schema,
		'~standard': {
			version: 1,
			vendor: 'ajv',
			validate: (data) => {
				const formatted = formatData(data);
				// Async schemas are not used: the result is a boolean.
				const valid = /** @type {boolean} */ (validate(formatted));
				if (valid) return { value: /** @type {T} */ (formatted) };
				return { issues: (validate.errors || []).map(errorToIssue) };
			},
		},
	};
};
