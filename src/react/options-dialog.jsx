import React from 'react';

import { setOption } from './actions';
import { getState } from './store';
import Form from './form';

const formData = [
	{
		title: 'Navigation Mode',
		property: 'mouse-options',
		options: [ option( 'brush', 'Brushing' ), option( 'pan', 'Panning' ) ],
	}, {
		title: 'Plotting order',
		property: 'summary-options',
		options: [ option( 'minimum', 'High to Low' ), option( 'maximum', 'Low to High' ) ]
	}, {
		title: 'Dot Plot Coloring',
		property: 'plot-var-options',
		options: [
			option( 'logks', 'log ks' ),
			option( 'logkn', 'log kn' ),
			option( 'logkskn', 'log ks/kn' )
		]
	}, {
		title: 'Color Scale',
		property: 'colorOptions',
		options: [
			option( 'rg', 'red-green' ),
			option( 'rg_quantized', 'rg_quantized' ),
			option( 'rainbow', 'rainbow' ),
			option( 'rainbow_quantized', 'rainbow_quantized' ),
			option( 'auto', 'auto' )
		]
	}
];

function option( value, text ) {
	return [ value, text ];
}

export default React.createClass( {
	render() {
		const state = getState();

		return (
			<div id="form-wrapper">
				{ formData.map( form => (
					<Form key={ `form-${ form.property }` } {...{ ...form, selectedOption: state[ form.property ] } } />
				) ) }

				<div className="radio-button-box">
					<strong>Auto-scale persistence</strong>

					<input
						id="persistence"
						{...{ type: 'range', min: 0, max: 100, step: 1, value: state.persistence } }
						onChange={ e => setOption( 'persistence', e.target.value ) }
					/>
					<button id="persistence-button" type="button">Refresh auto scale</button>

					<p>Largest persistence edge that will be removed: <label id="persistence-text">{ state.persistence }</label></p>
				</div>
			</div>
		);
	}
} );