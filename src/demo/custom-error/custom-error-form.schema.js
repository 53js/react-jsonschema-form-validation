const customErrorFormSchema = {
	type: 'object',
	properties: {
		ageCustom: { type: 'integer', minimum: 18, maximum: 100 },
	},
	required: [
		'ageCustom',
	],
};

export default customErrorFormSchema;
