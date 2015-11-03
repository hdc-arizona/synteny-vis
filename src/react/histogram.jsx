import React from 'react';

import OptionsDialog from './options-dialog';

export default React.createClass( {
	render() {
		return (
			<div id="histogram-wrapper">
				<svg id="plot" className="histogram" />
				<svg id="plot2" className="histogram" />
				<svg id="plot3" className="histogram" />

				<OptionsDialog />
			</div>
		);
	}
} );