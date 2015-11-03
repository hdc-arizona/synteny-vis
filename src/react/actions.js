import { actionTypes } from './constants';
import { dispatch } from './store';

export function setOption( property, value ) {
	dispatch( { type: actionTypes.SET_OPTION, property, value } );
}