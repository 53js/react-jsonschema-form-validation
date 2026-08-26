/**
 * @import { StandardSchemaIssue, StandardSchemaResult } from './standard-schema'
 */

/**
 * The normalized error shape spoken by the whole library (`<FieldError>`,
 * `errorMessages` callbacks, `form.errors`), whatever the validation
 * provider.
 *
 * - `field`   — dot-path of the offending field (`'user.email'`,
 *               `'items.0.label'`); `''` for a root-level error.
 * - `code`    — normalized code when the provider maps into the core set
 *               (`required`, `type`, `min`, `max`, `minLength`, `maxLength`,
 *               `pattern`, `format`, `enum`), the provider's own code
 *               otherwise, `'unknown'` when the issue carries none.
 * - `message` — provider default message.
 * - `params`  — provider parameters (AJV: `{ limit }`, `{ missingProperty }`…).
 * - `raw`     — the original provider issue/error, untouched (AJV in verbose
 *               mode: `raw.data` is the current value of the field).
 *
 * @typedef {{
 *   field: string,
 *   code: string,
 *   message: string,
 *   params: Record<string, unknown>,
 *   raw: unknown,
 * }} FormError
 */

/**
 * Issue shape emitted by the library's own providers: the Standard Schema
 * issue, plus the optional members `normalizeIssues` knows how to read.
 * Third-party schemas (Zod…) emit their own issue objects, which usually
 * carry a `code` too — read opportunistically, never required.
 *
 * @typedef {StandardSchemaIssue & {
 *   code?: unknown,
 *   params?: unknown,
 *   raw?: unknown,
 * }} ProviderIssue
 */

/**
 * @param {PropertyKey | { key: PropertyKey }} segment
 * @returns {string}
 */
const segmentToString = (segment) => {
	const key = typeof segment === 'object' && segment !== null ? segment.key : segment;
	return String(key);
};

/**
 * Converts a Standard Schema issue path to the library's dot-path.
 *
 * @param {StandardSchemaIssue['path']} path
 * @returns {string}
 */
export const pathToField = (path) => (path || []).map(segmentToString).join('.');

/**
 * @param {ReadonlyArray<StandardSchemaIssue>} issues
 * @returns {FormError[]}
 */
export const normalizeIssues = (issues) => issues.map((issue) => {
	const { code, params, raw } = /** @type {ProviderIssue} */ (issue);
	return {
		field: pathToField(issue.path),
		code: typeof code === 'string' ? code : 'unknown',
		message: issue.message,
		params: params !== null && typeof params === 'object'
			? /** @type {Record<string, unknown>} */ (params)
			: {},
		raw: raw !== undefined ? raw : issue,
	};
});

/**
 * Sync-only guard (RFC 0001): Standard Schema allows `validate()` to return
 * a Promise (async refinements). The library validates on every change and
 * has no stale-result handling, so async schemas are rejected loudly.
 *
 * @template Output
 * @param {StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>} result
 * @returns {StandardSchemaResult<Output>}
 */
export const assertSyncResult = (result) => {
	if (result instanceof Promise || (typeof result === 'object' && typeof (/** @type {{ then?: unknown }} */ (result)).then === 'function')) {
		throw new Error(
			'react-jsonschema-form-validation: the schema returned a Promise from validate(). '
			+ 'Async validation is not supported (sync-only in v1).',
		);
	}
	return result;
};

/**
 * Runs a Standard Schema synchronously and returns the normalized errors.
 *
 * @param {import('./standard-schema').StandardSchema} schema
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: FormError[] }}
 */
export const runSchema = (schema, data) => {
	const result = assertSyncResult(schema['~standard'].validate(data));
	if (result.issues && result.issues.length) {
		return { valid: false, errors: normalizeIssues(result.issues) };
	}
	return { valid: true, errors: [] };
};
