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
	},
};
