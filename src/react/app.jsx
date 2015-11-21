import React from 'react';

import { getState, hook } from './store';
import Histogram from './histogram';

export default React.createClass( {
	componentDidMount() {
		this.setState( {
			unhook: hook( this.updateState )
		} );
	},

	componentWillUnmount() {
		this.state.unhook();
	},

	updateState() {
		this.setState( { state: getState() } );
	},

	render() {
		return (
			<div id="synteny-app" className="_synteny-dotplot-builder">
				<canvas id="dotplot-canvas-bak" className="dotplot" />
				<canvas id="dotplot-canvas" className="dotplot" />
				<svg id="dotplot" className="dotplot" />

				<Histogram />
			</div>
		);
	}
} );