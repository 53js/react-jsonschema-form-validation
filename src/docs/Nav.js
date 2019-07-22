import React from 'react';
/* eslint-disable import/no-extraneous-dependencies */
import { Link } from 'react-router-dom';
import {
	NavbarToggler,
	Container,
	Collapse,
	Navbar,
	NavbarBrand,
	Nav,
	NavItem,
	NavLink,
} from 'reactstrap';
/* eslint-enable import/no-extraneous-dependencies */

export default class UINav extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			showNavbar: false,
		};
		this.toggleNavbar = this.toggleNavbar.bind(this);
	}

	toggleNavbar(e) {
		e.preventDefault();
		const { showNavbar } = this.state;
		this.setState({
			showNavbar: !showNavbar,
		});
	}

	render() {
		const { showNavbar } = this.state;

		return (
			<Navbar className="header" color="faded" light expand="md">
				<Container>
					<NavbarBrand className="mr-auto" tag={Link} to="/">React JSON Schema Form Validation</NavbarBrand>
					<NavbarToggler onClick={this.toggleNavbar} />
					<Collapse navbar isOpen={showNavbar}>
						<Nav navbar className="ml-sm-auto">
							<NavItem>
								<NavLink tag={Link} to="/">Get started</NavLink>
							</NavItem>
							<NavItem>
								<NavLink tag={Link} to="/docs/">Docs</NavLink>
							</NavItem>
							<NavItem>
								<NavLink tag={Link} to="/examples/">Examples</NavLink>
							</NavItem>
							<NavItem>
								<NavLink href="https://github.com/53js/react-jsonschema-form-validation">GitHub</NavLink>
							</NavItem>
						</Nav>
					</Collapse>
				</Container>
			</Navbar>
		);
	}
}
