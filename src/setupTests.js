import { vi } from 'vitest';

// React >=18 only stays `act()`-warning-free when the environment opts in.
// RTL sets this flag itself around render/act, but setting it globally also
// covers updates triggered outside RTL helpers (timers, direct events).
// `global` rather than `globalThis`: ESLint 6's env predates ES2020.
global.IS_REACT_ACT_ENVIRONMENT = true;

const localStorageMock = {
	getItem: vi.fn(() => null),
	setItem: vi.fn(),
	clear: vi.fn(),
};

global.localStorage = localStorageMock;
