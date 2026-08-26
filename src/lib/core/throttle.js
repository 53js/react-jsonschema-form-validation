/**
 * A throttled function, as returned by {@link throttle}. Calling `cancel()`
 * discards any pending trailing invocation and resets the throttle state.
 *
 * @template {(...args: any[]) => void} T
 * @typedef {T & { cancel: () => void }} ThrottledFunc
 */

/**
 * Minimal local replacement for the deprecated `lodash.throttle` per-method
 * package, reproducing the lodash semantics this library relies on:
 * - leading edge: the first call in a quiet period invokes `func` immediately;
 * - trailing edge: calls made during the `wait` window are coalesced into a
 *   single invocation (with the latest arguments) at the end of the window;
 * - `cancel()`: drops any pending trailing invocation.
 *
 * @template {(...args: any[]) => void} T
 * @param {T} func The function to throttle.
 * @param {number} [wait] The number of milliseconds to throttle invocations to.
 * @returns {ThrottledFunc<T>} The throttled function.
 */
export const throttle = (func, wait = 0) => {
	/** @type {ReturnType<typeof setTimeout> | null} */
	let timeout = null;
	/** @type {Parameters<T> | null} */
	let pendingArgs = null;
	let lastInvokeTime = 0;

	/** @param {Parameters<T>} args */
	const invoke = (args) => {
		lastInvokeTime = Date.now();
		func(...args);
	};

	/** @param {Parameters<T>} args */
	const throttled = (...args) => {
		const remaining = wait - (Date.now() - lastInvokeTime);
		if (remaining <= 0 && !timeout) {
			invoke(args);
			return;
		}
		pendingArgs = args;
		if (!timeout) {
			timeout = setTimeout(() => {
				timeout = null;
				if (pendingArgs) {
					const args2 = pendingArgs;
					pendingArgs = null;
					invoke(args2);
				}
			}, Math.max(remaining, 0));
		}
	};

	throttled.cancel = () => {
		if (timeout) clearTimeout(timeout);
		timeout = null;
		pendingArgs = null;
		lastInvokeTime = 0;
	};

	return /** @type {ThrottledFunc<T>} */ (throttled);
};

