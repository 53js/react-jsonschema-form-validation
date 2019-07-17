import React from 'react';
import {
	Col,
	FormGroup,
	Label,
	Row,
} from 'reactstrap';

import {
	Field,
	FieldError,
	Form,
} from '../../lib';

import Submit from '../components/Submit';
import SelectWrapper from '../components/react-select/selectWrapper';

import reactSelectFormSchema from './react-select-form.schema';

class ReactSelectForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			formData: {
				book: [],
				movies: '',
				tvshow: '',
			},
			loading: false,
			success: false,
		};

		this.handleChange = this.handleChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleChange(data) {
		this.setState({
			formData: data,
			success: false,
		});
	}

	handleSubmit() {
		this.setState({ loading: true });
		setTimeout(() => {
			this.setState({ loading: false, success: true });
		}, 1500);
	}

	render() {
		const {
			formData,
			loading,
			success,
		} = this.state;

		return (
			<Form
				data={formData}
				onChange={this.handleChange}
				onSubmit={this.handleSubmit}
				schema={reactSelectFormSchema}
			>
				<FormGroup>
					<Label>Pick a french movie (max: 1)</Label>
					<Field
						className=""
						component={SelectWrapper}
						name="movies"
						isClearable
						onChange={(newVal, handleFieldChange) => handleFieldChange('movies', newVal)}
						options={[
							{
								name: 'Astérix : Le Secret de la Potion Magique - A.Astier',
								label: 'Astérix : Le Secret de la Potion Magique - A.Astier',
								value: 'Astérix : Le Secret de la Potion Magique - A.Astier',
							},
							{
								name: 'Cyrano de Bergerac - JP Rappeneau',
								label: 'Cyrano de Bergerac - JP Rappeneau',
								value: 'Cyrano de Bergerac - JP Rappeneau',
							},
							{
								name: 'Fanfan la Tulipe - Christian-Jaque',
								label: 'Fanfan la Tulipe - Christian-Jaque',
								value: 'Fanfan la Tulipe - Christian-Jaque',
							},
							{
								name: 'Jeux Interdits - R.Clément',
								label: 'Jeux Interdits - R.Clément',
								value: 'Jeux Interdits - R.Clément',
							},
							{
								name: 'Léon - L.Besson',
								label: 'Léon - L.Besson',
								value: 'Léon - L.Besson',
							},
							{
								name: 'Les Demoiselles de Rochefort - J.Demy',
								label: 'Les Demoiselles de Rochefort - J.Demy ',
								value: 'Les Demoiselles de Rochefort - J.Demy ',
							},
							{
								name: 'Les Parapluies de Cherbourg - J.Demy',
								label: 'Les Parapluies de Cherbourg - J.Demy',
								value: 'Les Parapluies de Cherbourg - J.Demy',
							},
						]}
						value={formData.movies}
					/>
					<FieldError name="movies" />
				</FormGroup>
				<FormGroup>
					<Label>Pick some books (min: 2)</Label>
					<Field
						component={SelectWrapper}
						name="books"
						isClearable
						isMulti
						onChange={(newVal, handleFieldChange) => handleFieldChange('books', newVal)}
						options={[
							{
								name: 'Crime on the Orient Express - A.Christie',
								label: 'Crime on the Orient Express - A.Christie',
								value: 'Crime on the Orient Express - A.Christie',
							},
							{
								name: 'Deathly Hallows - JK.Rowling',
								label: 'Deathly Hallows - JK.Rowling',
								value: 'Deathly Hallows - JK.Rowling',
							},
							{
								name: 'Do androids dream of electric sheep ? - Philip K.Dick',
								label: 'Do androids dream of electric sheep ? - Philip K.Dick',
								value: 'Do androids dream of electric sheep ? - Philip K.Dick',
							},
							{
								name: 'IT - Stephen King',
								label: 'IT - Stephen King',
								value: 'IT - Stephen King',
							},
							{
								name: 'Martine à la montagne - G.Delahaye',
								label: 'Martine à la montagne - G.Delahaye',
								value: 'Martine à la montagne - G.Delahaye',
							},
							{
								name: 'Wizard’s First Rule - T.Goodkind',
								label: 'Wizard’s First Rule - T.Goodkind',
								value: 'Wizard’s First Rule - T.Goodkind',
							},
							{
								name: 'The Call of Cthulhu - HP.Lovecraft',
								label: 'The Call of Cthulhu - HP.Lovecraft',
								value: 'The Call of Cthulhu - HP.Lovecraft',
							},
							{
								name: 'The Hobbit, or There and Back Again - JRR.Tolkien',
								label: 'The Hobbit, or There and Back Again - JRR.Tolkien',
								value: 'The Hobbit, or There and Back Again - JRR.Tolkien',
							},
							{
								name: 'The Tale of the Tree Brothers - Beedle the Bard',
								label: 'The Tale of the Tree Brothers - Beedle the Bard',
								value: 'The Tale of the Tree Brothers - Beedle the Bard',
							},
						]}
						value={formData.books}
					/>
					<FieldError name="books" />
				</FormGroup>
				<FormGroup>
					<Label>Pick a TV show (facultative)</Label>
					<Field
						component={SelectWrapper}
						name="tvshow"
						onChange={(newVal, handleFieldChange) => {
							handleFieldChange({
								target: {
									name: 'tvshow',
									value: newVal,
								},
							});
						}}
						isClearable
						options={[
							{
								name: 'Game of Thrones',
								label: 'Game of Thrones',
								value: 'Game of Thrones',
							},
							{
								name: 'Gotham',
								label: 'Gotham',
								value: 'Gotham',
							},
							{
								name: 'Kaamelott',
								label: 'Kaamelott',
								value: 'Kaamelott',
							},
							{
								name: 'Stranger Things',
								label: 'Stranger Things',
								value: 'Stranger Things',
							},

						]}
						value={formData.tvshow}
					/>
					<FieldError name="tvshow" />
				</FormGroup>
				<Row className="mb-4">
					<Col md="10" className="">
						<Submit loading={loading} success={success} />
					</Col>
				</Row>
			</Form>
		);
	}
}

export default ReactSelectForm;
