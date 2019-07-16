const customErrorFormSchema = {
	type: 'object',
	properties: {
		age: { type: 'integer', minimum: 18, maximum: 100 },
		cgu: { type: 'boolean', enum: [true] },
		email: { type: 'string', format: 'email' },
		emailVerification: { type: 'string', format: 'email', const: { $data: '1/email' } },
		firstName: { type: 'string' },
		gender: { type: 'string', enum: ['male', 'female'] },
		lastName: { type: 'string', minLength: 1 },
	},
	required: [
		'age',
		'cgu',
		'email',
		'emailVerification',
		'lastName',
	],
};

export default customErrorFormSchema;
