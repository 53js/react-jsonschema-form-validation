import React from 'react';
/* eslint-disable import/no-extraneous-dependencies */
import { Link, Route } from 'react-router-dom';
import {
	Container,
	Row,
	Col,
	Nav,
	NavItem,
	NavLink,
} from 'reactstrap';
/* eslint-enable import/no-extraneous-dependencies */

import './Examples.css';

import BasicForm from '../demo/basic';
import CustomMessageForm from '../demo/custom-error';
import ErrorMarkerForm from '../demo/error-marker';
import SimpleForm from '../demo/simple';
import ContextForm from '../demo/context';
import ReactSelectForm from '../demo/react-select';
import Header from './Header';

const items = [
	{
		Component: SimpleForm,
		name: 'Simple',
		to: '/examples/simple',
	},
	{
		Component: BasicForm,
		name: 'Basic',
		to: '/examples/',
	},
	{
		Component: ReactSelectForm,
		name: 'React-Select',
		to: '/examples/react-select',
	},
	{
		Component: CustomMessageForm,
		name: 'Custom error message',
		to: '/examples/custom-message-form',
	},
	{
		Component: ErrorMarkerForm,
		name: 'Error marker',
		to: '/examples/error-marker-form',
	},
	{
		Component: ContextForm,
		name: 'Using Form Context',
		to: '/examples/context-form',
	},
];

const Examples = () => (
	<Container className="content">
		<Header />
		<Row>
			<Col tag="main" md={{ size: 3, order: 2 }}>
				<div className="docs-sidebar mb-3">
					<h1 className="h5">Examples</h1>
					<p>
						<a href="https://github.com/53js/react-jsonschema-form-validation/tree/master/src/demo">Sources</a>
					</p>
					<Nav className="flex-column">
						{items.map((item) => (
							<NavItem key={item.to}>
								<NavLink tag={Link} to={item.to}>
									{item.name}
								</NavLink>
							</NavItem>
						))}
					</Nav>
				</div>
			</Col>
			<Col tag="aside" md={{ size: 9, order: 1 }} className="docSearch-content">
				{items.map((item) => (
					<Route
						exact
						path={item.to}
						key={item.to}
						render={() => (
							<>
								<h2>{item.name}</h2>
								<item.Component />
							</>
						)}
					/>
				))}
			</Col>
		</Row>
	</Container>
);

// Examples.propTypes = {
// 	match: PropTypes.shape({
// 		url: PropTypes.string.isRequired,
// 	}).isRequired,
// };


export default Examples;
