import React, { useContext } from 'react';

import { Context as FormContext } from '../../lib';

import Submit from '../components/Submit';
import './SubmitIfValid.css';

const SubmitIfValid = (props) => {
	const { valid } = useContext(FormContext); // using React Hooks
	return <Submit className="SubmitIfValid" disabled={!valid} {...props} />;
};

export default SubmitIfValid;
