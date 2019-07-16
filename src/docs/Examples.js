import React from 'react';
import { Link, Route } from 'react-router-dom';
import {
	Container,
	Row,
	Col,
	Nav,
	NavItem,
	NavLink,
} from 'reactstrap';

import './Examples.css';

import BasicForm from '../demo/basic';
import CustomMessageForm from '../demo/custom-error';
import ErrorMarkerForm from '../demo/error-marker';
import SimpleForm from '../demo/simple';
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
];

const Examples = () => (
	<Container className="content">
		<Header />
		<Row>
			<Col tag="main" md={{ size: 3, order: 2 }}>
				<div className="docs-sidebar mb-3">
					<h1 className="h5">Examples</h1>
					<Nav className="flex-column">
						{items.map(item => (
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
				{items.map(item => (
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
