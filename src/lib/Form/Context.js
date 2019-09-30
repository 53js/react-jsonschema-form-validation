import React from 'react';

const FormContext = React.createContext();

export default FormContext;

export const withFormContext = (cb) => <FormContext.Consumer>{cb}</FormContext.Consumer>;
