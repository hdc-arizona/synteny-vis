import eventsFactory from 'events';
const emitter = new eventsFactory.EventEmitter();

import { actionTypes } from './constants';

const initialState = {
	'mouse-options': 'brush',
	'summary-options': 'minimum',
	'plot-var-options': 'logks',
	colorOptions: 'rg',
	persistence: 40
};

let state = clearState();

function clearState() {
	return Object.assign( {}, initialState );
}

function emit() {
	emitter.emit( 'change' );
}

export function hook( callback ) {
	emitter.on( 'change', callback );

	return () => emitter.off( 'change', callback );
}

export function getState() {
	return state;
}

export function dispatch( action ) {
	let oldState = state;

	switch ( action.type ) {
		case actionTypes.SET_OPTION:
			state = Object.assign( {}, state, { [ action.property ]: action.value } );
			break;
		default:
			break;
	}

	if ( oldState !== state ) {
		emit();
	}
}