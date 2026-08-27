/* eslint-disable react-hooks/rules-of-hooks */
// The branch below depends on the environment only (window exists or not),
// so within any single environment the same hook is called every render —
// what the rule is really about. Disabled file-wide for that one line.
import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` in the browser (props bound before any event can
 * fire), `useEffect` on the server where React warns about layout effects.
 * Decided per call rather than at module load so a test can swap the
 * environment.
 *
 * @type {typeof useLayoutEffect}
 */
export const useIsomorphicLayoutEffect = (effect, deps) => (
	typeof window === 'undefined' ? useEffect(effect, deps) : useLayoutEffect(effect, deps)
);
