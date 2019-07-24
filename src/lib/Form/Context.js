import React from 'react';

const Context = React.createContext();

export default Context;

export const withContext = cb => <Context.Consumer>{cb}</Context.Consumer>;
