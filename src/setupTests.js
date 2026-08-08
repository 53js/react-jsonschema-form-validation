import { vi } from 'vitest';

const localStorageMock = {
	getItem: vi.fn(() => null),
	setItem: vi.fn(),
	clear: vi.fn(),
};

global.localStorage = localStorageMock;
