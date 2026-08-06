/**
 * @import {
 *   ReactNode,
 *   ElementType,
 *   Ref,
 *   FocusEvent,
 *   ForwardRefRenderFunction,
 *   ComponentProps,
 *   ComponentPropsWithRef,
 * } from 'react'
 * @import { FormChangeEvent, SafePropsOmit } from '../Form/helpers'
 * @import { FormContextValue } from '../Form/Context.types'
 */

import classnames from 'classnames';
import memoize from 'memoize-one';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

import { withFormContext } from '../Form/Context';

/**
 * `onChange` handler for a default `<Field>` (intrinsic `<input>`).
 * For `<Field component={C}>`, prefer `PolymorphicFieldChangeHandler<C>`
 * or let TypeScript infer the handler type from context.
 *
 * @typedef {(
 *   event: FormChangeEvent,
 *   formHandleFieldChange: FormContextValue['handleFieldChange'],
 * ) => void} FieldChangeHandler
 */

/**
 * First argument type of component `C`'s handler `K` (`'onChange'` or
 * `'onBlur'`). Falls back to `FormChangeEvent` / `FocusEvent` when `C`
 * doesn't declare the handler.
 *
 * Only the FIRST argument is captured. Handlers with additional
 * parameters (e.g. `(option, action) => void`) type the first one only.
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
 * `onChange` handler whose first parameter follows what `C` emits:
 * a DOM event for intrinsic elements, a raw value for custom components.
 *
 * @template {ElementType} C
 * @typedef {(
 *   eventOrValue: ChildEmit<C, 'onChange'>,
 *   formHandleFieldChange: FormContextValue['handleFieldChange'],
 * ) => void} PolymorphicFieldChangeHandler
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
 *   component?: ElementType,
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
 * - `onChange`    — user override. First parameter follows what `C` emits
 *                   (a DOM event for intrinsic elements, a raw value for
 *                   custom components). The form's internal handler is
 *                   passed as the second parameter so the user can still
 *                   apply the change from inside their handler.
 * - `onBlur`      — user override; always fires *after* `form.touch(name)`.
 *                   First parameter polymorphic on `C.onBlur`.
 *
 * @template {ElementType} [C = 'input']
 * @typedef {(
 *   Omit<FieldBaseProps, 'component' | 'forwardedRef' | 'onChange' | 'onBlur'>
 *   & {
 *     component?: C,
 *     onChange?: PolymorphicFieldChangeHandler<C> | null,
 *     onBlur?: ((arg: ChildEmit<C, 'onBlur'>) => void) | null,
 *   }
 *   & SafePropsOmit<ComponentProps<C>, keyof FieldBaseProps | 'ref' | 'onChange' | 'onBlur'>
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
		/** @type {string} */ name,
	) => /** @param {any} eventOrValue */ (eventOrValue) => {
		if (onChange) {
			// User-supplied onChange replaces the default behavior. Passes
			// whatever the child emitted (raw value or DOM event), along
			// with the form's own update handler.
			onChange(eventOrValue, handleFieldChange);
			return;
		}

		// Wrap non-event emissions (raw string / object / etc.) into a
		// synthetic event carrying this Field's `name`, so downstream
		// state updates land under the right key.
		const isEvent = eventOrValue != null
			&& typeof eventOrValue === 'object'
			&& eventOrValue.target != null
			&& typeof eventOrValue.target === 'object'
			&& typeof eventOrValue.target.name === 'string';

		handleFieldChange(
			isEvent
				? eventOrValue
				: { target: { name, value: eventOrValue } },
		);
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
				onChange={this.memoGetOnChangeHandler(onChange, form.handleFieldChange, name)}
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

// `React.forwardRef` itself is not generic; the type annotation on the
// default export below reinstates the polymorphism so consumers get full
// autocomplete and type-checking for the props of the `component` they
// pass. `ref` is typed via `ComponentPropsWithRef<C>['ref']` so it matches
// the underlying component (e.g. `Ref<HTMLInputElement>` by default, or
// the custom handle type when a user component is supplied).
const FieldComponent = React.forwardRef(
	/** @type {ForwardRefRenderFunction<unknown, FieldBaseProps>} */
	((props, ref) => <Field {...props} forwardedRef={ref} />),
);

export default /** @type {<C extends ElementType = 'input'>(
	props: FieldProps<C> & { ref?: ComponentPropsWithRef<C>['ref'] }
) => JSX.Element | null} */ (
	/** @type {unknown} */ (FieldComponent)
);
