import React, { useContext } from 'react';

const FormContext = React.createContext();

export default FormContext;

export const useFormContext = () => useContext(FormContext);

export const withFormContext = (cb) => <FormContext.Consumer>{cb}</FormContext.Consumer>;
