import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '../vitest.config';

// Runs the SAME test suite as the root vitest.config.js, but against the
// React major selected by $REACT_VERSION (18 or 19), whose packages live in
// test-runtime/react-<version>/node_modules (installed by setup.sh).
//
// Mechanics: resolve.alias rewrites the four React-coupled bare imports to
// the fixture's copies. Vite's alias matches `find` exactly or as a
// `find + '/'` prefix, so `react` also covers `react/jsx-runtime` without
// touching `react-dom`. The aliased packages are then externalized by
// vitest (node_modules paths), so their OWN imports (react-dom -> react,
// @testing-library/react -> react-dom/client...) resolve with plain Node
// resolution from inside the fixture directory — one React instance per
// run, no yarn 1 gymnastics in the root tree.

const here = path.dirname(fileURLToPath(import.meta.url));

const reactVersion = process.env.REACT_VERSION;
if (!['18', '19'].includes(reactVersion)) {
	throw new Error(
		`test-runtime: REACT_VERSION must be "18" or "19", got "${reactVersion}". `
		+ 'Run e.g.: REACT_VERSION=18 yarn vitest run --config test-runtime/vitest.config.js',
	);
}

const fixtureModules = path.join(here, `react-${reactVersion}`, 'node_modules');
const fromFixture = (pkg) => path.join(fixtureModules, pkg);

export default mergeConfig(baseConfig, defineConfig({
	// The suite lives at the repo root; pin it so the config also works when
	// vitest is not launched from there.
	root: path.join(here, '..'),
	resolve: {
		alias: {
			'@testing-library/dom': fromFixture('@testing-library/dom'),
			'@testing-library/react': fromFixture('@testing-library/react'),
			'react-dom': fromFixture('react-dom'),
			react: fromFixture('react'),
		},
	},
	test: {
		// mergeConfig concatenates: src/setupTests.js (from the base config)
		// runs first, then the React >=18 act environment flag.
		setupFiles: ['test-runtime/act-env.js'],
	},
}));
