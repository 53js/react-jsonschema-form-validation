/**
 * Root entry: the core plus JSON Schema batteries — a plain JSON Schema
 * passed as `schema` (to `useForm` or `<Form>`) is wrapped by the AJV
 * provider automatically, so the 5-line getting started stays unchanged.
 * Consumers of other Standard Schema providers (Zod, Valibot…) can import
 * from `react-jsonschema-form-validation/core` instead and never bundle AJV.
 *
 * @import { ElementType, ComponentProps, ForwardRefRenderFunction } from 'react'
 * @import { JSONSchema7Definition } from 'json-schema'
 * @import { StandardSchema } from './core/standard-schema'
 * @import { SafePropsOmit } from './core/types'
 * @import { UseFormConfig, FormApi } from './core/useForm'
 * @import { FormHookModeProps, FormSugarModeProps, ReservedFormPropKeys } from './core/Form'
 * @import { AjvLike } from './providers/ajv'
 */

import React, { forwardRef, useMemo } from 'react';

import CoreForm from './core/Form';
import { isStandardSchema } from './core/standard-schema';
import coreUseForm from './core/useForm';
import { ajvSchema } from './providers/ajv';

// Star re-export so every core TYPE reaches the root entry too (a JS
// module cannot `export type`). The two runtime names this module
// redefines (`Form`, `useForm`) shadow the star per the ES spec — local
// exports always win — which is exactly the sugar layering wanted here.
// `import/export` is silenced file-wide: it flags that shadowing.
/* eslint-disable import/export */
export * from './core';

/**
 * `useForm` configuration of the root entry: `schema` also accepts a plain
 * JSON Schema, `ajv` a custom AJV instance (v8) for it.
 *
 * @template [T = Record<string, unknown>]
 * @typedef {Omit<UseFormConfig<T>, 'schema'> & {
 *   schema: StandardSchema | JSONSchema7Definition,
 *   ajv?: AjvLike,
 * }} JsonSchemaUseFormConfig
 */

/**
 * Props of the root `<Form>`: the core union with `schema` widened to plain
 * JSON Schema (+ `ajv`) in sugar mode, both masked in hook mode.
 *
 * @template [T = Record<string, unknown>]
 * @template {ElementType} [C = 'form']
 * @typedef {(
 *   (FormHookModeProps<T, C> & { ajv?: never })
 *   | (Omit<FormSugarModeProps<T, C>, 'schema'> & {
 *     schema: StandardSchema | JSONSchema7Definition,
 *     ajv?: AjvLike,
 *   })
 * ) & SafePropsOmit<ComponentProps<C>, ReservedFormPropKeys | 'ajv'>} FormProps
 */

/**
 * Memoized per `(schema, ajv)` identity so the compiled validator stays
 * stable across renders — the same guarantee `memoize-one` gave in 0.x.
 *
 * @param {StandardSchema | JSONSchema7Definition | undefined} schema
 * @param {AjvLike | undefined} ajv
 * @returns {StandardSchema | undefined}
 */
const useResolvedSchema = (schema, ajv) => useMemo(
	() => {
		if (schema === undefined || isStandardSchema(schema)) return schema;
		return ajvSchema(schema, ajv ? { ajv } : {});
	},
	[schema, ajv],
);

/**
 * @template [T = Record<string, unknown>]
 * @param {JsonSchemaUseFormConfig<T>} config
 * @returns {FormApi<T>}
 */
export const useForm = (config) => {
	const schema = /** @type {StandardSchema} */ (useResolvedSchema(config.schema, config.ajv));
	return coreUseForm({ ...config, schema });
};

/**
 * @type {ForwardRefRenderFunction<HTMLFormElement, {
 *   schema?: StandardSchema | JSONSchema7Definition,
 *   ajv?: AjvLike,
 *   [key: string]: unknown,
 * }>}
 */
const FormRender = ({ ajv, schema, ...rest }, ref) => {
	const resolved = useResolvedSchema(schema, ajv);
	// Cast: the discriminated union is enforced on the public export, the
	// pass-through itself is untyped by design.
	const coreProps = /** @type {any} */ ({ ...rest, schema: resolved });
	return <CoreForm {...coreProps} ref={ref} />;
};

const Form = forwardRef(FormRender);
Form.displayName = 'Form';

/**
 * Public signature of the root `<Form>`: polymorphic on `T` (data shape)
 * and `C` (wrapper element), dual-mode union enforced through `FormProps`.
 *
 * @typedef {<T = Record<string, unknown>, C extends ElementType = 'form'>(
 *   props: FormProps<T, C> & { ref?: React.Ref<HTMLFormElement> }
 * ) => JSX.Element | null} FormComponent
 */

const TypedForm = /** @type {FormComponent} */ (/** @type {unknown} */ (Form));

export { TypedForm as Form };
