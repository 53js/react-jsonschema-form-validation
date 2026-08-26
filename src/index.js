/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { createRoot } from 'react-dom/client';
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

// React 18 concurrent root: the demo exercises the library the way v1
// consumers will mount it (createRoot), not through the legacy sync render.
createRoot(document.getElementById('root')).render(<App />);
