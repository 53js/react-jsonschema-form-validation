'use client';

/**
 * @import {
 *   ReactNode,
 *   ElementType,
 *   FocusEvent,
 *   ForwardRefRenderFunction,
 *   ComponentProps,
 *   ComponentPropsWithRef,
 * } from 'react'
 * @import { FormChangeEvent, SafePropsOmit } from './types'
 * @import { FormApi } from './useForm'
 * @import { FormState } from './store'
 */

import classnames from 'classnames';
import React, { forwardRef, memo, useCallback } from 'react';

import { useResolvedForm } from './Context';
import {
	selectFieldErrorDescribedBy,
	selectIsFieldInvalid,
	selectIsFieldTouched,
} from './selectors';
import { useFormSelector } from './useFormSelector';

/**
 * `onChange` handler for a default `<Field>` (intrinsic `<input>`).
 *
 * @typedef {(
 *   event: FormChangeEvent,
 *   formHandleFieldChange: FormApi<any>['handleFieldChange'],
 * ) => void} FieldChangeHandler
 */

/**
 * First argument type of component `C`'s handler `K`.
 *
 * @template {ElementType} C
 * @template {'onChange' | 'onBlur'} K
 * @typedef {K extends 'onChange'
 *     ? (ComponentProps<C> extends { onChange?: (arg: infer A, ...rest: any) => any }
 *         ? A
 *         : FormChangeEvent)
 *     : (ComponentProps<C> extends { onBlur?: (arg: infer A, ...rest: any) => any }
 *         ? A
 *         : FocusEvent)
 * } ChildEmit
 */

/**
 * @template {ElementType} C
 * @typedef {(
 *   eventOrValue: ChildEmit<C, 'onChange'>,
 *   formHandleFieldChange: FormApi<any>['handleFieldChange'],
 * ) => void} PolymorphicFieldChangeHandler
 */

/**
 * Base props of `<Field>`.
 *
 * - `name` — path within the form data this field reads/writes.
 * - `form` — explicit association (the React counterpart of HTML's `form=""`
 *            attribute), only when the field lives outside the `<Form>`
 *            subtree or targets another form. Default: nearest `<Form>`.
 *
 * @typedef {{
 *   name: string,
 *   form?: FormApi<any>,
 *   'aria-describedby'?: string | null,
 *   children?: ReactNode,
 *   className?: string,
 *   component?: ElementType,
 *   onBlur?: ((event: FocusEvent) => void) | null,
 *   onChange?: FieldChangeHandler | null,
 * }} FieldBaseProps
 */

/**
 * @template {ElementType} [C = 'input']
 * @typedef {(
 *   Omit<FieldBaseProps, 'component' | 'onChange' | 'onBlur'>
 *   & {
 *     component?: C,
 *     onChange?: PolymorphicFieldChangeHandler<C> | null,
 *     onBlur?: ((arg: ChildEmit<C, 'onBlur'>) => void) | null,
 *   }
 *   & SafePropsOmit<ComponentProps<C>, keyof FieldBaseProps | 'ref' | 'onChange' | 'onBlur'>
 * )} FieldProps
 */

// Native elements that accept the `form` content attribute (HTML
// "form-associated elements"). `<Field>` sets `form={form.id}` on them so
// the DOM association always matches the React one — including through
// portals, where the control is not a descendant of the <form> element.
const FORM_ASSOCIATED_ELEMENTS = new Set([
	'button', 'fieldset', 'input', 'object', 'output', 'select', 'textarea',
]);

/**
 * @typedef {FieldBaseProps & { [key: string]: unknown }} FieldInnerProps
 */

/** @type {ForwardRefRenderFunction<unknown, FieldInnerProps>} */
const FieldRender = (props, ref) => {
	const {
		'aria-describedby': ariaDescribedBy,
		children,
		className,
		component: Component = 'input',
		form: formProp,
		name,
		onBlur,
		onChange,
		...rest
	} = props;

	const form = useResolvedForm(formProp, 'Field');

	const selector = useCallback(
		/** @param {FormState} state */
		(state) => {
			const isTouched = selectIsFieldTouched(state, name);
			// Both ARIA attributes are gated on the same reveal condition as
			// the visual error styling (touched or submitted) — see 0.x.
			const revealed = isTouched || state.isSubmitted;
			return {
				isInvalid: selectIsFieldInvalid(state, name),
				isTouched,
				isSubmitted: state.isSubmitted,
				describedBy: revealed ? selectFieldErrorDescribedBy(state, name) : undefined,
			};
		},
		[name],
	);
	const {
		isInvalid, isTouched, isSubmitted, describedBy,
	} = useFormSelector(form, selector);

	const handleBlur = useCallback(
		/** @param {FocusEvent} event */
		(event) => {
			form.touch(name);
			if (onBlur) onBlur(event);
		},
		[form, name, onBlur],
	);

	const handleChange = useCallback(
		/** @param {any} eventOrValue */
		(eventOrValue) => {
			if (onChange) {
				onChange(eventOrValue, form.handleFieldChange);
				return;
			}
			const isEvent = eventOrValue != null
				&& typeof eventOrValue === 'object'
				&& eventOrValue.target != null
				&& typeof eventOrValue.target === 'object'
				&& typeof eventOrValue.target.name === 'string';
			form.handleFieldChange(
				isEvent ? eventOrValue : { target: { name, value: eventOrValue } },
			);
		},
		[form, name, onChange],
	);

	const revealed = isTouched || isSubmitted;
	const ariaDescribedByValue = [ariaDescribedBy, describedBy].filter(Boolean).join(' ') || undefined;
	const nativeFormAttribute = typeof Component === 'string' && FORM_ASSOCIATED_ELEMENTS.has(Component)
		? form.id
		: undefined;

	return (
		<Component
			aria-invalid={revealed && isInvalid ? true : undefined}
			className={classnames('Jfv_Field', className, { isInvalid, isSubmitted, isTouched })}
			form={nativeFormAttribute}
			name={name}
			onBlur={handleBlur}
			onChange={handleChange}
			ref={ref}
			{...rest}
			aria-describedby={ariaDescribedByValue}
		>
			{children}
		</Component>
	);
};

// Cast: `forwardRef` strips `ref` through `PropsWithoutRef`, which does not
// compose with the index signature of the inner props; the public typing
// is restored by the export cast below anyway.
// `memo`: a parent re-render with equal props (the common case — `name`,
// `component`… are stable) bails out; the store subscription alone decides
// when a Field re-renders. Same role as `PureComponent` in 0.x, but this
// time nothing inside forces a render on unrelated state changes.
const FieldComponent = memo(forwardRef(
	/** @type {ForwardRefRenderFunction<unknown, any>} */ (FieldRender),
));
FieldComponent.displayName = 'Field';

/**
 * Public signature of `<Field>`: polymorphic on the rendered component
 * `C`, `ref` typed after it.
 *
 * @typedef {<C extends ElementType = 'input'>(
 *   props: FieldProps<C> & { ref?: ComponentPropsWithRef<C>['ref'] }
 * ) => JSX.Element | null} FieldComponentType
 */

export const Field = /** @type {FieldComponentType} */ (/** @type {unknown} */ (FieldComponent));
