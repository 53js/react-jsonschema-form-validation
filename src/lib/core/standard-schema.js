/**
 * Vendored Standard Schema v1 interface (https://standardschema.dev).
 *
 * The spec is designed to be copied rather than depended upon: any object
 * carrying a `~standard` property with this shape is accepted as a
 * validation schema — Zod (>= 3.24), Valibot, ArkType, Effect Schema
 * implement it natively; JSON Schema goes through the bundled AJV provider
 * (`react-jsonschema-form-validation/providers/ajv`). Only the members the
 * library reads are declared.
 */

/**
 * One reported problem. `path` is absent for root-level issues; each
 * segment is either a property key or an object carrying it (`{ key }`,
 * the spec's escape hatch for non-serializable keys).
 *
 * @typedef {{
 *   message: string,
 *   path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>,
 * }} StandardSchemaIssue
 */

/**
 * @template Output
 * @typedef {(
 *   { value: Output, issues?: undefined }
 *   | { issues: ReadonlyArray<StandardSchemaIssue> }
 * )} StandardSchemaResult
 */

/**
 * @template [Input = unknown]
 * @template [Output = Input]
 * @typedef {{
 *   version: 1,
 *   vendor: string,
 *   validate: (value: unknown) =>
 *     StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>,
 *   types?: { input: Input, output: Output },
 * }} StandardSchemaProps
 */

/**
 * @template [Input = unknown]
 * @template [Output = Input]
 * @typedef {{ '~standard': StandardSchemaProps<Input, Output> }} StandardSchema
 */

/**
 * Duck-typed guard: does `value` implement Standard Schema v1? Objects and
 * functions alike — ArkType's `Type` is a callable carrying `~standard`.
 *
 * @param {unknown} value
 * @returns {value is StandardSchema}
 */
export const isStandardSchema = (value) => (
	value !== null
	&& (typeof value === 'object' || typeof value === 'function')
	&& '~standard' in value
	&& typeof (/** @type {{ '~standard'?: { validate?: unknown } }} */ (value))['~standard']?.validate === 'function'
);
