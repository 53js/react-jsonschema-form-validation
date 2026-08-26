import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Anchored to the project's own src/ so that node_modules/**/src/*.js
// never matches. Vite module ids always use forward slashes, even on
// Windows: normalize the root the same way before building the regex.
const srcJsRE = new RegExp(`^${escapeRegExp(projectRoot.split(path.sep).join('/'))}/src/.*\\.js$`);

// Library build (npm `dist`), separate from vite.config.js which builds the
// demo site. Replaces the previous Babel CLI build (`babel src/lib --out-dir
// dist`): same published surface — ESM modules mirroring the src/lib file
// structure at the root of dist/ — produced by Vite/Rollup instead.
export default defineConfig({
	esbuild: {
		// The library uses JSX inside plain .js files (same recipe as the
		// demo/test configs).
		loader: 'jsx',
		include: srcJsRE,
		// Vite's esbuild plugin excludes .js files by default; the default
		// exclude wins over include, so it must be reset explicitly.
		exclude: [],
		// Classic JSX runtime (React.createElement): the sources import React
		// explicitly, like the Babel build before.
		jsx: 'transform',
	},
	build: {
		outDir: 'dist',
		// `yarn dist` runs `clean` first and dist:css before dist:js: the
		// CSS files are already in dist/ when this build runs.
		emptyOutDir: false,
		// public/ belongs to the demo app, not to the npm package.
		copyPublicDir: false,
		// Keep the output readable and diffable, as the Babel build was.
		// Consumers minify in their own bundler.
		minify: false,
		lib: {
			// Multi-entry: the provider subpath is not imported by the root
			// entry (consumers of other Standard Schema providers must not
			// bundle AJV), so it needs its own entry to be emitted at all.
			// With `preserveModules` the two graphs share their common
			// modules (Form/helpers) as single files.
			entry: {
				index: path.resolve(projectRoot, 'src/lib/index.js'),
				'providers/ajv/index': path.resolve(projectRoot, 'src/lib/providers/ajv/index.js'),
			},
			formats: ['es'],
			// Emit .js (not Vite's default .mjs for an ES build): the
			// package has always published dist/**/*.js and the exports
			// map/module fields point there. Concatenation instead of a
			// template literal: a template starting with "${" crashes the
			// template-curly-spacing rule under babel-eslint 10 / ESLint 6.
			fileName: (format, entryName) => entryName.concat('.js'),
		},
		rollupOptions: {
			// Externalize every bare import (dependencies and
			// peerDependencies): nothing is bundled, exactly like the Babel
			// per-file transform before.
			external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
			output: {
				// Keep the src/lib module structure instead of a single
				// bundle file: preserves per-module tree-shaking for
				// consumers and keeps the published layout unchanged.
				preserveModules: true,
				preserveModulesRoot: 'src/lib',
			},
		},
	},
});
