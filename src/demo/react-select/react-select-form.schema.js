const reactSelectFormSchema = {
	type: 'object',
	properties: {
		movies: {
			type: 'object',
			properties: {
				label: { type: 'string', minimum: 1 },
				name: { type: 'string', minimum: 1 },
				value: { type: 'string', minimum: 1 },
			},
		},
		books: {
			type: 'array',
			items: [
				{
					type: 'object',
				},
			],
			minItems: 2,
		},
		tvshow: {
			type: 'object',
			properties: {
				label: { type: 'string', minimum: 1 },
				name: { type: 'string', minimum: 1 },
				value: { type: 'string', minimum: 1 },
			},
		},
	},
	required: [
		'movies',
		'books',
	],
};

export default reactSelectFormSchema;
