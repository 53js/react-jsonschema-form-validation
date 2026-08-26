/**
 * AJV provider: wraps a JSON Schema into a Standard Schema v1 object, so a
 * JSON Schema speaks the same protocol as Zod / Valibot / ArkType. Ships as
 * its own entry (`react-jsonschema-form-validation/providers/ajv`) so
 * consumers of other providers never bundle AJV.
 *
 * Not wired into `<Form>` yet — the class component keeps its direct AJV
 * path until `useForm` lands (RFC 0001, PR 3).
 *
 * @import { ErrorObject } from 'ajv'
 * @import { JSONSchema7Definition } from 'json-schema'
 * @import { StandardSchema } from '../../core/standard-schema'
 * @import { ProviderIssue } from '../../core/errors'
 */

import {
	createAjv,
	dataPathToFieldPath,
	formatData,
	pointerToSegments,
} from '../../Form/helpers';

// Re-exported so a custom instance can be built from the subpath alone:
// `import { ajvSchema, createAjv } from '…/providers/ajv'`.
export { createAjv };

/**
 * Anything exposing `compile(schema)` — the provider never relies on the
 * exact Ajv class (`Ajv2019` / `Ajv2020` instances are fine).
 *
 * @typedef {{
 *   compile: (schema: any) =>
 *     ((data: unknown) => boolean | Promise<unknown>) & { errors?: ErrorObject[] | null },
 * }} AjvLike
 */

/**
 * AJV keyword → normalized code (RFC 0001). Everything else passes through
 * under its own keyword (`oneOf`, `multipleOf`, `uniqueItems`, `minItems`…).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const AJV_CODE_MAP = Object.freeze({
	minimum: 'min',
	exclusiveMinimum: 'min',
	maximum: 'max',
	exclusiveMaximum: 'max',
});

/**
 * Path segments of an AJV error: `instancePath` (AJV 8, JSON Pointer) when
 * present, legacy `dataPath` (AJV 6, dot/bracket notation) otherwise;
 * `required` errors point at the missing property itself.
 *
 * @param {ErrorObject & { dataPath?: string }} error
 * @returns {string[]}
 */
export const errorToSegments = (error) => {
	/** @type {string[]} */
	let segments;
	if (typeof error.instancePath === 'string') {
		segments = pointerToSegments(error.instancePath);
	} else {
		const field = dataPathToFieldPath(error.dataPath ?? '');
		segments = field === '' ? [] : field.split('.');
	}
	if (error.keyword === 'required' && 'missingProperty' in error.params) {
		return [...segments, String(error.params.missingProperty)];
	}
	return segments;
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

/** @type {ReturnType<typeof createAjv> | undefined} */
let defaultAjv;
const getDefaultAjv = () => {
	if (!defaultAjv) defaultAjv = createAjv();
	return defaultAjv;
};

/**
 * Wraps a JSON Schema into a Standard Schema object backed by AJV. The
 * schema is compiled once, here: memoize the returned object per
 * `(schema, ajv)` pair when calling from a render.
 *
 * `validate(data)` normalizes empty form values first (`''` / `null` →
 * `undefined`, so `required` flags them — see `formatData`), then reports
 * every AJV error as an issue carrying the normalized `code`, the AJV
 * `params` and the verbose `ErrorObject` as `raw` (`raw.data` = current
 * value of the field, issue #6).
 *
 * @template [T = unknown]
 * @param {JSONSchema7Definition} schema
 * @param {{ ajv?: AjvLike }} [options] `ajv`: a custom AJV 8 instance (must
 *   register `ajv-formats` itself if it relies on string formats).
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
