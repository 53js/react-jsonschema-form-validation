import path from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Anchored to the project's own src/ so that node_modules/**/src/*.js
// never matches. Vite module ids always use forward slashes, even on
// Windows: normalize the root the same way before building the regex.
const srcJsRE = new RegExp(`^${escapeRegExp(projectRoot.split(path.sep).join('/'))}/src/.*\\.js$`);

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
		// Classic JSX runtime (React.createElement): the sources import React
		// explicitly, matching the library build (vite.lib.config.js).
		react({ jsxRuntime: 'classic' }),
	],
	esbuild: {
		loader: 'jsx',
		include: srcJsRE,
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
		// Demo output, uploaded to GitHub Pages by .github/workflows/pages.yml.
		// Not to be confused with dist/ (npm package build).
		outDir: 'build',
	},
});
