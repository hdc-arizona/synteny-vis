'use strict';

import React from 'react';
import ReactDOM from 'react-dom';

import { setOption } from 'react/actions';
import { getState } from 'react/store';
import App from 'react/app';

const histogram = require('histogram');
const dotplot = require('dotplot');
const _ = require('lodash');
const d3 = require('d3');
const autoscale = require('auto-colorscale');

require('style.css');

const {
	RUN_BENCHMARKS,
	SHOW_MAXIMA_AND_MINIMA
} = require('constants');

function controller(dataObj, element_id, meta) {
	ReactDOM.render( React.createElement( App ), document.getElementById( element_id ) );

	const refreshAutoScale = () => {
		const { persistence } = getState();

		const h = histograms[activeField];
		h.setColorScale(autoscale.generateAutoScale(h.bins(), persistence));

		if (SHOW_MAXIMA_AND_MINIMA)
			_.each(histograms, h => h.updateMinMaxMarkers(persistence));

		// TODO: Fix this so we can run it syncronously without
		//       messing up the form onChange handlers
		setTimeout( () => setOption( 'colorOptions', 'auto' ), 100 );
	};

	const getPersistence = () => getState().persistence;

	d3.select('#persistence')
		.on('input', () => {
			refreshAutoScale();
		});

	d3.select('#persistence-button')
		.on('click', () => {
			refreshAutoScale();
		});

	/* zoom/pan switching */
	d3.selectAll('#mouse-options input[name=mouse-options]')
		.on('change', function() {
			syntenyPlot.setNavMode(this.value);
		});

	/* summary mode switching */
	d3.selectAll('#summary-options input[name=summary-options]')
		.on('change', function() {
			dataObj.setOrder('logks', this.value === 'minimum');
		});

	/* Plot variable switching */
	d3.selectAll('#plot-var-options input[name=plot-var-options]')
		.on('change', function() {
			histograms[activeField].setColorScale(colorScale(activeField, 'unselected'));
			activeField = this.value;
			syntenyPlot.setField(activeField);
			var newCS;
			if (activeCS === 'auto') {
				newCS = autoscale.generateAutoScale(histograms[activeField].bins(), getPersistence());
			} else {
				newCS = colorScale(activeField, activeCS);
			}
			syntenyPlot.setColorScale(newCS);
			histograms[activeField].setColorScale(newCS);
		});

	/* color mode switching */
	var activeField = 'logks';
	var activeCS = 'rg';
	d3.selectAll('#colorOptions input[name=colorOptions]')
		.on('change', function() {
			var newCS;
			if (this.value === 'auto') {
				newCS = autoscale.generateAutoScale(histograms[activeField].bins(), getPersistence());
			} else {
				newCS = colorScale(activeField, this.value);
			}
			histograms[activeField].setColorScale(newCS);
			syntenyPlot.setColorScale(newCS);
			activeCS = this.value;
		});

	const colorScale = require('colorscales').onData(dataObj.currentData().raw);

	const initial = colorScale(activeField, 'rg');
	const unselected = colorScale(activeField, 'unselected');

	const syntenyPlot = dotplot.synteny('#dotplot', dataObj, 'logks', initial, meta);
	const histograms = {
		'logks': histogram.histogram('#plot', dataObj, 'logks', initial),
		'logkn': histogram.histogram('#plot2', dataObj, 'logkn', unselected),
		'logkskn': histogram.histogram('#plot3', dataObj, 'logkskn', unselected)
	};

	// Since the histograms aren't controlling their own color scale policy
	// now (a good thing), we need to manually fire of their update methods.
	// Eventually, we should fix this up.
	dataObj.addListener((typeHint) => {
		if(typeHint.indexOf('stop') > -1)
			_.each(histograms, h => h.updateMinMaxMarkers(getPersistence()));
	});
	dataObj.notifyListeners('initial');

	/* Benchmark */
	if (RUN_BENCHMARKS) {
		const [minLogKs, maxLogKs] = d3.extent(dataObj.currentData().raw, x => x.logks);
		const points = _.range(minLogKs, maxLogKs, (maxLogKs - minLogKs) / 10);

		const rangeList = _.chain(points)
			.map(lo => _.map(points, hi => [lo, hi]))
			.flatten()
			.filter(([lo, hi]) => lo < hi)
			.value();

		const asyncBenchmark = require('async-benchmark');
		asyncBenchmark.benchmark(rangeList, function(range) {
			histograms.logks.brush.extent(range);
			histograms.logks.brush.event(histograms.logks.selection);
		}, function(info) {
			alert('Average brush time: ' + info.average + ', max: ' + info.max);
		});
	}
}

exports.controller = controller;
