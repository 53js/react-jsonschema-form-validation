const customErrorFormSchema = {
	type: 'object',
	properties: {
		email: { type: 'string', format: 'email' },
		emailVerification: { type: 'string', format: 'email', const: { $data: '1/email' } },
		firstName: { type: 'string' },
		lastName: { type: 'string', minLength: 1 },
	},
	required: [
		'email',
		'emailVerification',
		'lastName',
	],
};

export default customErrorFormSchema;
