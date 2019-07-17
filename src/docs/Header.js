import React, { PureComponent } from 'react';
/* eslint-disable import/no-extraneous-dependencies */
import {
	Button,
	Col,
	Container,
	Jumbotron,
	Row,
} from 'reactstrap';
import { Link } from 'react-router-dom';
/* eslint-enable import/no-extraneous-dependencies */

class Header extends PureComponent {
	render() {
		return (
			<Jumbotron tag="section" className="jumbotron-header text-center mb-3">
				<Container>
					<Row>
						<Col>
							{/* <p className="lead">
	                <img src="/assets/logo.png" alt="" width="150px" />
	              </p> */
							}
							<h1 className="jumbotron-heading display-4">React JSON Schema Form Validation</h1>
							<p className="lead">
								Easy to use Form with JSON Schema & React
							</p>
							<p>
								<Button outline color="danger" href="https://github.com/53js/react-jsonschema-form-validation">GitHub</Button>
								<Button color="danger" tag={Link} to="/docs/">Docs</Button>
							</p>
						</Col>
					</Row>
				</Container>
			</Jumbotron>
		);
	}
}

Header.propTypes = {

};

export default Header;
