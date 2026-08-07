import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The demo (src/docs) and the published library (src/lib) both use JSX inside
// plain .js files. Renaming the src/lib files is not an option (they are
// published as-is by `dist:js`), so esbuild is told to parse every src/*.js
// file with the JSX loader instead.
export default defineConfig({
	// GH Pages serves the demo under /react-jsonschema-form-validation/
	// (parity with the CRA "homepage" field). Routing itself uses HashRouter,
	// only asset URLs are affected.
	base: '/react-jsonschema-form-validation/',
	plugins: [
		// react 16.12 predates react/jsx-runtime -> classic runtime.
		react({ jsxRuntime: 'classic' }),
	],
	esbuild: {
		loader: 'jsx',
		include: /src\/.*\.js$/,
		// Vite's esbuild plugin excludes .js files by default; the default
		// exclude wins over include, so it must be reset explicitly.
		exclude: [],
	},
	optimizeDeps: {
		esbuildOptions: {
			loader: {
				'.js': 'jsx',
			},
		},
	},
	build: {
		// CRA output directory, kept so the `docs` script (mv build docs)
		// stays unchanged. Not to be confused with dist/ (npm package build).
		outDir: 'build',
	},
});
