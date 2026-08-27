'use client';

/**
 * @import { ReactNode, ElementType, ComponentProps } from 'react'
 * @import { ErrorMessagesMap, SafePropsOmit } from './types'
 * @import { FormApi } from './useForm'
 * @import { FormState } from './store'
 * @import { FormError } from './errors'
 */

import classnames from 'classnames';
import React, {
	memo, useCallback, useContext, useEffect, useId,
} from 'react';

import { getFieldErrorId } from '../a11y';
import { ErrorMessagesContext, useResolvedForm } from './Context';
import { deepEqual } from './deepEqual';
import { getErrorMessage } from './getErrorMessage';
import { selectFieldErrors, selectIsFieldTouched } from './selectors';
import { useFormSelector } from './useFormSelector';

/**
 * @typedef {{
 *   name: string,
 *   form?: FormApi<any>,
 *   children?: ReactNode,
 *   className?: string,
 *   component?: ElementType,
 *   errorMessages?: ErrorMessagesMap | null,
 *   id?: string | null,
 * }} FieldErrorBaseProps
 */

/**
 * @template {ElementType} [C = 'div']
 * @typedef {(
 *   Omit<FieldErrorBaseProps, 'component'>
 *   & { component?: C }
 *   & SafePropsOmit<ComponentProps<C>, keyof FieldErrorBaseProps | 'ref'>
 * )} FieldErrorProps
 */

/**
 * @typedef {{
 *   error: FormError | undefined,
 *   isTouched: boolean,
 *   isSubmitted: boolean,
 * }} FieldErrorSelection
 */

/**
 * @param {FieldErrorSelection} a
 * @param {FieldErrorSelection} b
 */
// The error is compared structurally: any change (`params`, `raw.data`…)
// may change the displayed message.
const isEqualSelection = (a, b) => deepEqual(a.error, b.error)
	&& a.isTouched === b.isTouched
	&& a.isSubmitted === b.isSubmitted;

/**
 * Displays the first error of field `name`. Its DOM id (deterministic,
 * derived from `form.id` + `name`, or the `id` prop) is registered in the
 * form as long as the component is mounted — even while no error is
 * displayed — so the matching `<Field>` can reference it through
 * `aria-describedby`.
 *
 * @param {FieldErrorBaseProps & { [key: string]: unknown }} props
 */
const FieldErrorRender = (props) => {
	const {
		children,
		className,
		component: Component = 'div',
		errorMessages: fieldErrorMessages,
		form: formProp,
		id,
		name,
		...rest
	} = props;

	const form = useResolvedForm(formProp, 'FieldError');
	const registryKey = useId();
	const effectiveId = id != null ? id : getFieldErrorId(form.id, name);

	// Registration happens in effects, never during render. Two effects:
	// a `name` / `id` change updates the entry in place (mount order of the
	// IDREF list preserved) instead of unregister + append.
	useEffect(() => () => form.unregisterFieldError(registryKey), [form, registryKey]);
	useEffect(() => {
		form.registerFieldError(registryKey, name, effectiveId);
	}, [form, registryKey, name, effectiveId]);

	const formErrorMessages = useContext(ErrorMessagesContext);

	const selector = useCallback(
		/** @param {FormState} state @returns {FieldErrorSelection} */
		(state) => ({
			error: selectFieldErrors(state, name)[0],
			isTouched: selectIsFieldTouched(state, name),
			isSubmitted: state.isSubmitted,
		}),
		[name],
	);
	const { error, isTouched, isSubmitted } = useFormSelector(form, selector, isEqualSelection);

	if (!error) return null;

	return (
		<Component
			className={classnames('Jfv_FieldError', className, { isSubmitted, isTouched })}
			id={effectiveId}
			role="alert"
			{...rest}
		>
			{children || getErrorMessage(error, { ...formErrorMessages, ...fieldErrorMessages })}
		</Component>
	);
};

// `memo`: see <Field>.
const FieldErrorComponent = memo(FieldErrorRender);
FieldErrorComponent.displayName = 'FieldError';

/**
 * Public signature of `<FieldError>`: polymorphic on the rendered
 * component `C`.
 *
 * @typedef {<C extends ElementType = 'div'>(
 *   props: FieldErrorProps<C>
 * ) => JSX.Element | null} FieldErrorComponentType
 */

export const FieldError = /** @type {FieldErrorComponentType} */ (
	/** @type {unknown} */ (FieldErrorComponent)
);
