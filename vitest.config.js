import { coverageConfigDefaults, defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

// Reuses the demo's Vite config (JSX-in-.js esbuild recipe, classic JSX
// runtime) so the tests parse the exact same sources as the
// bundler, and only adds the test-specific settings on top.
export default mergeConfig(viteConfig, defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['src/setupTests.js'],
		coverage: {
			provider: 'istanbul',
			// Parity with the previous Jest `collectCoverageFrom`
			// (src/lib/**/*.{js,jsx,ts,tsx}); `all` reports files never
			// imported by any test, as Jest did.
			all: true,
			include: ['src/lib/**/*.{js,jsx,ts,tsx}'],
			// Keep the default exclusions (test files, configs…) and also
			// leave the manual mocks out of the report, as Jest did.
			exclude: [...coverageConfigDefaults.exclude, '**/__mocks__/**'],
			reporter: ['text', 'json', 'json-summary', 'lcov'],
		},
	},
}));
