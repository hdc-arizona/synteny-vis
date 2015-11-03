import React from 'react';

import { setOption } from './actions';

export default React.createClass( {
	render() {
		const { title, property, options, selectedOption } = this.props;

		return (
			<div className="radio-button-box">
				<strong>{ title }</strong>

				<form id={ property }>
					{ options.map( ( [ value, label ], index ) => (
						<span key={ `input-${ index }` }>
							<label>{ label }</label>
							<input
								type="radio"
								name={ property }
								value={ value }
								checked={ value === selectedOption }
								onChange={ () => setOption( property, value ) }
							/>
						</span>
					) ) }
				</form>
			</div>
		);
	}
} );