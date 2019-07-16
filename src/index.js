/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { render } from 'react-dom';
import { HashRouter as Router, Route, Switch } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import './lib/styles/main.scss';

import { Home, Nav, Footer } from './docs';
import Examples from './docs/Examples';
import Documentation from './docs/Documentation';

const App = () => (
	<Router>
		<main className="app">
			<Nav />
			<Switch>
				<Route exact path="/" component={Home} />
				<Route path="/examples/" component={Examples} />
				<Route path="/docs/" component={Documentation} />
			</Switch>
			<Footer />
		</main>
	</Router>
);

render(<App />, document.getElementById('root'));
