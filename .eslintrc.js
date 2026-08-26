module.exports = {
	extends: [
		'53js/react',
		'plugin:jest/recommended',
	],
	env: {
		browser: true
	},
	parser: 'babel-eslint',
	rules: {
		'react/jsx-one-expression-per-line': 0, // Buggy
		'react/jsx-props-no-spreading': 'off',
		'react/state-in-constructor': 'off',
		// v1 drops prop-types (RFC 0001): props are typed by JSDoc + tsc.
		'react/prop-types': 'off',
		// v1 ships named exports only (tree-shaking, one import style).
		'import/prefer-default-export': 'off',
	},
	overrides: [
		{
			// The published library: no default export anywhere (config files
			// keep the default their tooling requires).
			files: ['src/lib/**/*.js'],
			rules: {
				'import/no-default-export': 'error',
			},
		},
		{
			// The demo app is not published to npm; it imports its UI stack
			// (reactstrap, react-select, ...) from devDependencies by design.
			files: ['src/demo/**/*.js'],
			rules: {
				'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
			},
		},
		{
			// Root build-tool config files import devDependencies by design.
			files: ['vite.config.js', 'vite.lib.config.js', 'vitest.config.js'],
			rules: {
				'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
				// `vitest/config` is an `exports` subpath; the node resolver
				// bundled with eslint-plugin-import 2.20 predates package
				// exports and cannot see it.
				'import/no-unresolved': ['error', { ignore: ['^vitest/config$'] }],
			},
		},
		{
			// Vitest injects its globals (`globals: true` in vitest.config.js).
			// eslint-plugin-vitest would declare them but requires ESLint 8;
			// declare the ones not already covered by the jest plugin env.
			files: ['src/**/*.test.js', 'src/**/__mocks__/*.js', 'src/setupTests.js'],
			globals: {
				vi: 'readonly',
			},
			rules: {
				// Test setup files import test-only packages (vitest), like
				// the *.test.js files already allowed by the base config.
				'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
			},
		},
	],
};
