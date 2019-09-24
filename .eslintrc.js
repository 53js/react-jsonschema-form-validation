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
		'react/state-in-constructor': 'off',
		'react/jsx-one-expression-per-line': 0 // Buggy
	},
};
