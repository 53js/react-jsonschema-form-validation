/**
 * Accessibility helpers shared by `<Field>` and `<FieldError>`.
 *
 * Lives in its own module (not `Form/helpers`) because it carries no form
 * logic — it only wires the two components together.
 */

/**
 * Deterministic id of the `<FieldError>` associated with a field `name`.
 *
 * `<Field>` uses it as the default `aria-describedby`, `<FieldError>` as its
 * default `id`, so the two stay linked without any shared state. `name` may
 * contain dots or brackets (e.g. `user.emails[0]`): both are valid inside an
 * HTML id attribute, so the name is used as-is.
 *
 * @param {string} name
 * @returns {string}
 */
const getFieldErrorId = (name) => `jfv-error-${name}`;

export default getFieldErrorId;
