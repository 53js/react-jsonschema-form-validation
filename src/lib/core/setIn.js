/**
 * Local, dependency-free replacement for `dot-prop-immutable`'s `set()`
 * (the only function of that package the library ever used). The package
 * has been unmaintained since 2020, so its semantics are inlined here and
 * pinned by tests (they were validated against the real
 * `dot-prop-immutable@2.1.0` with a differential test battery before the
 * dependency was removed).
 *
 * Reproduced semantics:
 * - Dot-separated paths (`'user.email'`, `'items.0.label'`) — the same
 *   grammar as `<Field name>` and the `field` of formatted errors. A `\.`
 *   escapes a literal dot inside a key (`'a\\.b'` targets the key `'a.b'`).
 * - Structural immutability: only the branches on the written path get new
 *   references (arrays cloned with `slice`, objects with spread); untouched
 *   siblings keep their identity — `React.memo` / `PureComponent` friendly.
 * - Missing intermediates are created as plain objects — even for numeric
 *   segments (`set({}, 'list.1', 'x')` gives `{ list: { 1: 'x' } }`, not an
 *   array). Arrays are only index-addressed when they already exist.
 * - On an existing array: `$end` targets the last index, indexes may carry a
 *   leading `+`, any other non-integer segment throws
 *   `Array index '…' has to be an integer`, and out-of-bounds indexes
 *   extend the array (holes in between).
 * - Scalar intermediates are spread-cloned like objects (numbers/booleans
 *   collapse to `{}`, strings to char-indexed objects); a `null`
 *   intermediate followed by more segments throws a `TypeError`, exactly
 *   like the original.
 * - A function `value` acts as an updater: it receives the current value at
 *   the path and its return value is written.
 *
 * One deliberate deviation, for safety: property writes go through
 * `Object.defineProperty` instead of `clone[key] = value`. For regular keys
 * the result is identical (own enumerable/writable/configurable data
 * property), but a `'__proto__'` segment creates a plain own property
 * instead of triggering the `Object.prototype.__proto__` setter (which in
 * the original silently rewrote the clone's prototype). Combined with the
 * fact that writes only ever target freshly created clones, no path can
 * mutate a shared prototype (`__proto__`, `constructor.prototype`, …).
 */

/**
 * Splits a dot-separated path into segments, honoring `\.` escapes: a
 * segment ending with a lone (unescaped) backslash is merged with the next
 * one, the backslash becoming a literal dot. Same algorithm as
 * `dot-prop-immutable`'s `propToArray`.
 *
 * @param {string} path
 * @returns {string[]}
 */
const splitPath = (path) => path.split('.').reduce(
	(/** @type {string[]} */ segments, segment, index, list) => {
		const previous = index > 0 ? list[index - 1] : undefined;
		if (previous !== undefined && /(?:^|[^\\])\\$/.test(previous)) {
			const merged = segments.pop() ?? '';
			segments.push(`${merged.slice(0, -1)}.${segment}`);
		} else {
			segments.push(segment);
		}
		return segments;
	},
	[],
);

/**
 * Resolves a path segment against an existing array: `$end` becomes the
 * last index (0 on an empty array), integer segments (optionally
 * `+`-prefixed) are parsed, anything else throws — same behavior as
 * `dot-prop-immutable`'s `getArrayIndex`.
 *
 * @param {string} segment
 * @param {readonly unknown[]} array
 * @returns {number}
 */
const toArrayIndex = (segment, array) => {
	if (segment === '$end') return Math.max(array.length - 1, 0);
	if (!/^\+?\d+$/.test(segment)) {
		throw new Error(`Array index '${segment}' has to be an integer`);
	}
	return parseInt(segment, 10);
};

/**
 * Writes an own data property without ever invoking a setter inherited
 * from the prototype chain (notably the `__proto__` accessor). This is the
 * prototype-pollution guard described in the module JSDoc.
 *
 * @param {object} target
 * @param {string | number} key
 * @param {unknown} value
 */
const defineOwn = (target, key, value) => {
	Object.defineProperty(target, key, {
		value,
		writable: true,
		enumerable: true,
		configurable: true,
	});
};

/**
 * Returns a copy of `data` with the value at `path` replaced by `value`,
 * cloning only the traversed branch (see module JSDoc for the full
 * semantics).
 *
 * @template T
 * @param {T} data
 * @param {string} path - Dot-separated field path (e.g. `'items.0.label'`).
 * @param {unknown} value - Value to write, or an updater function receiving
 *   the current value at the path.
 * @returns {T}
 */
export const setIn = (data, path, value) => {
	const segments = splitPath(path);

	/**
	 * @param {unknown} target
	 * @param {number} i
	 * @returns {unknown}
	 */
	const setInRec = (target, i) => {
		if (i >= segments.length) {
			return typeof value === 'function' ? value(target) : value;
		}

		/** @type {string | number} */
		let head = segments[i];
		/** @type {Record<PropertyKey, unknown> | unknown[]} */
		let clone;
		if (Array.isArray(target)) {
			head = toArrayIndex(head, target);
			clone = target.slice();
		} else {
			// Spread-clones any non-array: objects keep their own enumerable
			// properties, `null`/numbers/booleans collapse to `{}`, strings
			// become char-indexed objects — same as the original's
			// `Object.assign({}, obj)`.
			const source = /** @type {Record<PropertyKey, unknown>} */ (target);
			clone = { ...source };
		}

		// Reading `target[head]` throws a TypeError when `target` is null or
		// undefined and segments remain — intentional parity with the
		// original implementation.
		const current = /** @type {Record<PropertyKey, unknown>} */ (target)[head];
		defineOwn(clone, head, setInRec(current !== undefined ? current : {}, i + 1));
		return clone;
	};

	return /** @type {T} */ (setInRec(data, 0));
};
