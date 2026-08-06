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
 * Caveats:
 * - Rendering several `<FieldError>` with the same `name` produces duplicate
 *   ids (invalid HTML). Override `id` on all but one of them in that case.
 * - A `name` containing spaces cannot be referenced this way:
 *   `aria-describedby` is a space-separated IDREF list, so the generated id
 *   would be read as several ids. Override both `id` and `aria-describedby`
 *   for such names.
 *
 * @param {string} name
 * @returns {string}
 */
const getFieldErrorId = (name) => `jfv-error-${name}`;

export default getFieldErrorId;
