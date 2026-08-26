/**
 * Accessibility helpers shared by `<Field>` and `<FieldError>`.
 *
 * Lives in its own module (not `Form/helpers`) because it carries no form
 * logic — it only wires the two components together.
 */

/**
 * Deterministic default id of a `<FieldError>` for field `name` inside the
 * `<Form>` instance identified by `formId`.
 *
 * The `formId` prefix guarantees that two `<Form>`s rendered on the same
 * page with a field of the same `name` produce distinct error ids — without
 * it, an `aria-describedby` IDREF could resolve to the error of the OTHER
 * form. `name` may contain dots or brackets (e.g. `user.emails[0]`): both
 * are valid inside an HTML id attribute, so the name is used as-is.
 *
 * `<Field>`'s `aria-describedby` does NOT call this function: it reads the
 * ids actually registered by the mounted `<FieldError>`s from the form
 * context (see `getFieldErrorDescribedBy`), so a custom `id` prop on
 * `<FieldError>` stays referenced automatically.
 *
 * Caveats:
 * - Rendering several `<FieldError>` with the same `name` in one form
 *   produces duplicate default ids (invalid HTML). Override `id` on all but
 *   one of them in that case.
 * - A `name` containing spaces cannot be referenced this way:
 *   `aria-describedby` is a space-separated IDREF list, so the generated id
 *   would be read as several ids. Override `id` for such names.
 *
 * @param {string} formId
 * @param {string} name
 * @returns {string}
 */
export const getFieldErrorId = (formId, name) => `${formId}-error-${name}`;

