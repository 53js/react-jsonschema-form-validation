import React from 'react';

import { useFormContext } from '../../lib';

import Submit from '../components/Submit';
import './SubmitIfValid.css';

const SubmitIfValid = (props) => {
	const { valid } = useFormContext(); // using React Hooks
	return <Submit className="SubmitIfValid" disabled={!valid} {...props} />;
};

export default SubmitIfValid;
