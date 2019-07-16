import React from 'react';
import { Container, Row, Col } from 'reactstrap';

import './Footer.css';

export default () => (
	<footer className="footer">
		<Container>
			<Row>
				<Col className="text-center">
					By <a href="https://www.53js.fr" title="53js">53js</a>
				</Col>
			</Row>
		</Container>
	</footer>
);
