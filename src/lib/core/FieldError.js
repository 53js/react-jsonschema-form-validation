/**
 * @import { ReactNode, ElementType, ComponentProps } from 'react'
 * @import { ErrorMessagesMap, SafePropsOmit } from './types'
 * @import { FormApi } from './useForm'
 * @import { FormState } from './store'
 * @import { FormError } from './errors'
 */

import classnames from 'classnames';
import React, {
	memo, useCallback, useEffect, useId,
} from 'react';

import getFieldErrorId from '../a11y';
import { useResolvedForm } from './Context';
import getErrorMessage from './getErrorMessage';
import { isSameError, selectFieldErrors, selectIsFieldTouched } from './selectors';
import useFormSelector from './useFormSelector';

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
 *   errorMessages: ErrorMessagesMap | undefined,
 * }} FieldErrorSelection
 */

/**
 * @param {FieldErrorSelection} a
 * @param {FieldErrorSelection} b
 */
const isEqualSelection = (a, b) => isSameError(a.error, b.error)
	&& a.isTouched === b.isTouched
	&& a.isSubmitted === b.isSubmitted
	&& a.errorMessages === b.errorMessages;

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

	// Registration happens in an effect, never during render.
	useEffect(() => {
		form.registerFieldError(registryKey, name, effectiveId);
		return () => form.unregisterFieldError(registryKey);
	}, [form, registryKey, name, effectiveId]);

	const selector = useCallback(
		/** @param {FormState} state @returns {FieldErrorSelection} */
		(state) => ({
			error: selectFieldErrors(state, name)[0],
			isTouched: selectIsFieldTouched(state, name),
			isSubmitted: state.isSubmitted,
			errorMessages: state.errorMessages,
		}),
		[name],
	);
	const {
		error, isTouched, isSubmitted, errorMessages,
	} = useFormSelector(form, selector, isEqualSelection);

	if (!error) return null;

	return (
		<Component
			className={classnames('Jfv_FieldError', className, { isSubmitted, isTouched })}
			id={effectiveId}
			role="alert"
			{...rest}
		>
			{children || getErrorMessage(error, { ...errorMessages, ...fieldErrorMessages })}
		</Component>
	);
};

// `memo`: see <Field>.
const FieldError = memo(FieldErrorRender);
FieldError.displayName = 'FieldError';

export default /** @type {<C extends ElementType = 'div'>(
	props: FieldErrorProps<C>
) => JSX.Element | null} */ (
	/** @type {unknown} */ (FieldError)
);
