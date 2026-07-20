/**
 * @import {
 *   ReactNode,
 *   ReactElement,
 *   ElementType,
 *   Ref,
 *   FocusEvent,
 *   ForwardRefRenderFunction,
 *   ComponentPropsWithoutRef,
 *   ComponentPropsWithRef,
 * } from 'react'
 * @import { FormChangeEvent } from '../Form/helpers'
 * @import { FormContextValue } from '../Form/Context'
 */

import classnames from 'classnames';
import memoize from 'memoize-one';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

import { withFormContext } from '../Form/Context';

/**
 * Signature of the user-supplied `onChange` handler. It receives the event
 * and the form's internal handler so the user can decide whether to apply,
 * transform or skip the update.
 *
 * @typedef {(
 *   event: FormChangeEvent,
 *   formHandleFieldChange: FormContextValue['handleFieldChange'],
 * ) => void} FieldChangeHandler
 */

/**
 * Base props of `<Field>` — the validation-specific props handled by the
 * component itself. The public, polymorphic `FieldProps<C>` extends this
 * with the props of the underlying component `C`.
 *
 * `forwardedRef` is an implementation detail (injected by the outer
 * `React.forwardRef` wrapper) and is omitted from the public polymorphic
 * type below.
 *
 * @typedef {{
 *   name: string,
 *   children?: ReactNode,
 *   className?: string,
 *   component?: ElementType | string,
 *   forwardedRef?: Ref<unknown> | null,
 *   onBlur?: ((event: FocusEvent) => void) | null,
 *   onChange?: FieldChangeHandler | null,
 * }} FieldBaseProps
 */

/**
 * Polymorphic props of `<Field>`. When `component={X}` is supplied, every
 * prop accepted by `X` is also accepted here (with autocomplete and typo
 * detection). The default `C = 'input'` matches the runtime default.
 *
 * - `name`        — path within the form data this field reads/writes.
 * - `component`   — host element or component (default `'input'`).
 * - `onChange`    — user override; receives the raw event plus the form's
 *                   internal change handler so the user can decide whether
 *                   to apply, transform or skip the update.
 * - `onBlur`      — user override; always fires *after* `form.touch(name)`.
 *
 * @template {ElementType} [C = 'input']
 * @typedef {(
 *   Omit<FieldBaseProps, 'component' | 'forwardedRef'>
 *   & { component?: C }
 *   & Omit<ComponentPropsWithoutRef<C>, keyof FieldBaseProps>
 * )} FieldProps
 */

/** @extends {PureComponent<FieldBaseProps>} */
class Field extends PureComponent {
	memoGetClassnames = memoize((
		/** @type {string | undefined} */ className,
		/** @type {boolean} */ isInvalid,
		/** @type {boolean} */ isSubmitted,
		/** @type {boolean} */ isTouched,
	) => classnames(
		'Jfv_Field',
		className,
		{
			isInvalid,
			isSubmitted,
			isTouched,
		},
	))

	memoGetOnBlurHandler = memoize((
		/** @type {FormContextValue['touch']} */ touch,
		/** @type {string} */ name,
		/** @type {((e: FocusEvent) => void) | null | undefined} */ onBlur,
	) => /** @param {FocusEvent} event */ (event) => {
		touch(name);
		if (onBlur) onBlur(event);
	})

	memoGetOnChangeHandler = memoize((
		/** @type {FieldChangeHandler | null | undefined} */ onChange,
		/** @type {FormContextValue['handleFieldChange']} */ handleFieldChange,
	) => /** @param {FormChangeEvent} event */ (event) => {
		if (onChange) {
			// User-supplied onChange replaces the default behavior. We pass the
			// form's own update handler so the user can still apply the change
			// from inside their handler (e.g. after a transformation).
			onChange(event, handleFieldChange);
			return;
		}

		handleFieldChange(event);
	})

	/**
	 * @param {FormContextValue} form
	 */
	getClassnames = (form) => {
		const { className, name } = this.props;
		const { isFieldInvalid, isFieldTouched, isSubmitted } = form;

		return this.memoGetClassnames(
			className,
			isFieldInvalid(name),
			isSubmitted,
			isFieldTouched(name),
		);
	}

	render() {
		const {
			children,
			className,
			component: Component = 'input',
			onBlur,
			onChange,
			name,
			forwardedRef,
			...props
		} = this.props;

		return withFormContext((form) => (
			<Component
				className={this.getClassnames(form)}
				name={name}
				onBlur={this.memoGetOnBlurHandler(form.touch, name, onBlur)}
				onChange={this.memoGetOnChangeHandler(onChange, form.handleFieldChange)}
				ref={forwardedRef}
				{...props}
			>
				{children}
			</Component>
		));
	}
}

Field.propTypes = {
	children: PropTypes.node,
	className: PropTypes.string,
	component: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
	forwardedRef: PropTypes.oneOfType([
		PropTypes.shape({}),
		PropTypes.func,
	]),
	onBlur: PropTypes.func,
	onChange: PropTypes.func,
	name: PropTypes.string.isRequired,
};

Field.defaultProps = {
	children: null,
	className: '',
	component: 'input',
	forwardedRef: null,
	onBlur: null,
	onChange: null,
};

// `React.forwardRef` itself is not generic; the explicit type annotation
// below reinstates the polymorphism so consumers get full autocomplete
// and type-checking for the props of the `component` they pass.
const FieldComponent = React.forwardRef(
	/** @type {ForwardRefRenderFunction<unknown, FieldBaseProps>} */
	((props, ref) => <Field {...props} forwardedRef={ref} />),
);

/**
 * `ref` is typed via `ComponentPropsWithRef<C>['ref']` so the ref type
 * matches the underlying component (e.g. `Ref<HTMLInputElement>` by default,
 * or the custom handle type when a user component is supplied).
 *
 * @typedef {<C extends ElementType = 'input'>(
 *   props: FieldProps<C> & { ref?: ComponentPropsWithRef<C>['ref'] }
 * ) => ReactElement | null} PolymorphicFieldComponent
 */

/** @type {PolymorphicFieldComponent} */
const PolymorphicField = /** @type {PolymorphicFieldComponent} */ (
	/** @type {unknown} */ (FieldComponent)
);

export default PolymorphicField;
