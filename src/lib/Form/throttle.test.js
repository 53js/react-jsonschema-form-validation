import throttle from './throttle';

describe('throttle(func, wait)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should invoke immediately on the leading edge', () => {
		const func = vi.fn();
		const throttled = throttle(func, 200);

		throttled('first');

		expect(func).toHaveBeenCalledTimes(1);
		expect(func).toHaveBeenCalledWith('first');
	});

	it('should coalesce calls made during the wait window into one trailing call with the latest arguments', () => {
		const func = vi.fn();
		const throttled = throttle(func, 200);

		throttled('a');
		throttled('b');
		throttled('c');

		// Only the leading call has run so far.
		expect(func).toHaveBeenCalledTimes(1);
		expect(func).toHaveBeenCalledWith('a');

		vi.advanceTimersByTime(200);

		// The two coalesced calls produced a single trailing invocation,
		// carrying the most recent arguments.
		expect(func).toHaveBeenCalledTimes(2);
		expect(func).toHaveBeenLastCalledWith('c');
	});

	it('should not invoke a trailing call when no call happened during the wait window', () => {
		const func = vi.fn();
		const throttled = throttle(func, 200);

		throttled('only');
		vi.advanceTimersByTime(1000);

		expect(func).toHaveBeenCalledTimes(1);
	});

	it('cancel() should discard the pending trailing invocation', () => {
		const func = vi.fn();
		const throttled = throttle(func, 200);

		throttled('a');
		throttled('b');
		expect(func).toHaveBeenCalledTimes(1);

		throttled.cancel();
		vi.advanceTimersByTime(1000);

		// The pending trailing call for 'b' never fires.
		expect(func).toHaveBeenCalledTimes(1);
	});

	it('should allow a new leading invocation after cancel()', () => {
		const func = vi.fn();
		const throttled = throttle(func, 200);

		throttled('a');
		throttled('b');
		throttled.cancel();

		throttled('c');

		expect(func).toHaveBeenCalledTimes(2);
		expect(func).toHaveBeenLastCalledWith('c');
	});
});
