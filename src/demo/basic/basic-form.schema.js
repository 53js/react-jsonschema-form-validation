const simpleJsonSchema = {
	type: 'object',
	properties: {
		age: { type: 'integer', minimum: 18, maximum: 100 },
		ageCustom: { type: 'number', minimum: 18, maximum: 100 },
		cgu: { type: 'boolean', enum: [true] },
		email: { type: 'string', format: 'email' },
		emailVerification: { type: 'string', format: 'email', const: { $data: '1/email' } },
		gender: { type: 'string', enum: ['male', 'female'] },
		firstName: { type: 'string' },
		interests: { type: 'array', minItems: 1 },
		lastName: { type: 'string', minLength: 1 },
	},
	required: [
		'age',
		'cgu',
		'email',
		'emailVerification',
		'interests',
		'lastName',
	],
};

export default simpleJsonSchema;
