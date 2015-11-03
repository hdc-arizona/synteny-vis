'use strict';

const MARGIN = 50; /* Padding around histogram */
const HISTOGRAM_Y_SCALE_TRANS_LEN = 750; /* How long a y-axis histogram rescale takes */
const HISTOGRAM_COLOR_TRANS_LEN = 500; /* How long a color scale transition takes */
const NUM_HISTOGRAM_TICKS = 100;
const UNSELECTED_BAR_FILL = '#D0D0D0';

const persistenceFuncs = require('persistence');
const utils = require('utils');
const _ = require('lodash');
const d3 = require('d3');
const transform = require('svg-transform');

function histogram(id, dataObj, field, colorScale) {
	const dataExtent = d3.extent(_.pluck(dataObj.currentData().raw, field));

	const plot = d3.select(id);
	const plotWidth = utils.getComputedAttr(plot.node(), 'width');
	const plotHeight = utils.getComputedAttr(plot.node(), 'height');

	const prettyNames = {
		logks: 'log(ks)',
		logkn: 'log(kn)',
		logkskn: 'log(ks/kn)'
	};
	plot.append('text')
		.attr('x', 2 * plotHeight / 3)
		.attr('width', plotHeight / 3)
		.attr('y', 50)
		.attr('height', 50)
		.classed('histogram-title', true)
		.text(prettyNames[field]);

	function plotBrushBrush() {
		if (!plotBrush.empty()) {
			dataObj.addDataFilter(plotBrush.extent(), field);
		}
	}

	function plotBrushEnd() {
		if (plotBrush.empty()) {
			dataObj.removeDataFilter(field);
		}
		dataObj.notifyListeners('histogram-stop');
		updateColors(dataBarSel); // Cancel color animation -- just brushing
	}

	const xPlotScale = d3.scale.linear()
		.domain(dataExtent)
		.range([MARGIN, plotWidth - MARGIN]);

	const bins = utils.samplePointsInRange(dataExtent, NUM_HISTOGRAM_TICKS);
	const getYExtent = (summary) => [0, 3 / 2 * d3.max(_.pluck(summary, 'y'))];

	const yPlotScale = d3.scale.linear()
		.domain(getYExtent(dataObj.currentDataSummary(bins, field)))
		.range([plotHeight - MARGIN, MARGIN]);

	function getAutoScale(persistence) {
		const summary = dataObj.currentDataSummary(bins, field);
		const extrema = persistenceFuncs.simplify(summary, persistence);

		return generateColorScaleFromExtrema(extrema);
	}

	function isMaxima(A, i) {
		return A[i].y > Math.max(A[i - 1].y, A[i + 1].y);
	}

	function shouldBeMarked(x, i, A) {
		return i > 0 && i < A.length - 1 && isMaxima(A, i);
	}

	function generateColorScaleFromExtrema(extrema) {
		const colors = d3.scale.category10();

		const [peaks, valleys] = _.partition(extrema, shouldBeMarked);
		const coloredPeaks = _.map(peaks, function(x, i) {
			x.color = colors(i);
			return x;
		});

		const allPoints = _(coloredPeaks).concat(valleys).sortBy('x').value();

		const domain = _.map(allPoints, d => d.x + d.dx / 2);
		const range = _.map(allPoints, d => d.color || UNSELECTED_BAR_FILL);

		return d3.scale.linear().domain(domain).range(range);
	}

	function updateMinMaxMarkers(persistence) {
		const summary = dataObj.currentDataSummary(bins, field);
		const extrema = persistenceFuncs.simplify(summary, persistence);
		const markers = _.map(extrema, function(d, i, A) {
			return {
				color: shouldBeMarked(d, i, A) ? 'red' : 'orange',
				x: d.x + d.dx / 2,
				y: d.y
			};
		});

		const tempSelA = plot.selectAll('.maxMark').data(markers);
		tempSelA.exit().remove();
		tempSelA.enter().append('circle').classed('maxMark', 1);
		tempSelA
			.attr('cx', d => xPlotScale(d.x))
			.attr('cy', d => yPlotScale(d.y) - 5)
			.attr('r', 3)
			.attr('fill', d => d.color);
	}

	const plotBrush = d3.svg.brush()
		.x(xPlotScale)
		.on('brush', plotBrushBrush)
		.on('brushend', plotBrushEnd);

	const dataBarSel = plot.selectAll('.dataBars')
		.data(dataObj.currentDataSummary(bins, field))
		.enter()
		.append('rect').classed('dataBars', true)
		.attr('x', d => xPlotScale(d.x))
		.attr('width', d => xPlotScale(d.x + d.dx) - xPlotScale(d.x));

	const brushSelectForBM = plot.append('g').attr('id', 'plotbrush-group')
		.attr('transform', transform([{translate: [0, MARGIN]}]))
		.call(plotBrush);
	brushSelectForBM.selectAll('rect')
		.attr('height', plotHeight - 2 * MARGIN);

	const xAxis = d3.svg.axis().scale(xPlotScale).orient('bottom').tickSize(10);
	const yAxis = d3.svg.axis().scale(yPlotScale).orient('left').ticks(5);

	plot.append('g')
		.attr('transform', transform([{translate: [0, plotHeight - MARGIN]}]))
		.classed('xAxis', true).call(xAxis);
	const yAxisSel = plot.append('g')
		.attr('transform', transform([{translate: [MARGIN, 0]}]))
		.classed('yAxis', true).call(yAxis);

	const updateHeights = selection => {
		selection.transition(); // cancel transition
		selection.attr('y', d => yPlotScale(d.y));
	};
	const updateColors = selection => {
		selection.transition(); // cancel transition
		const extent = plotBrush.empty() ? [-Infinity, Infinity] : plotBrush.extent();
		const active = bin => bin.x + bin.dx > extent[0] && bin.x < extent[1];

		selection
			.attr('height', d => plotHeight - MARGIN - yPlotScale(d.y))
			.attr('fill', d => active(d) ? colorScale(d.x + d.dx / 2) : UNSELECTED_BAR_FILL);
	};

	const updatePlotAttrs = selection => {
		updateHeights(selection);
		updateColors(selection);
	}

	function updatePlot(typeHint) {
		dataBarSel.transition(); /* cancel previous transition */

		typeHint = typeHint || '';

		const summary = dataObj.currentDataSummary(bins, field);
		let tempSel = dataBarSel.data(summary);

		if (typeHint.indexOf('stop') > -1) {
			yPlotScale.domain(getYExtent(summary));
			yAxisSel.transition().duration(HISTOGRAM_Y_SCALE_TRANS_LEN).call(yAxis);
			tempSel = tempSel.transition().duration(HISTOGRAM_Y_SCALE_TRANS_LEN);
		} 

		tempSel.call(updatePlotAttrs);
	}

	dataObj.addListener(updatePlot);

	function setColorScale(newColorScale) {
		colorScale = newColorScale;
		updatePlot('stop'); /* trigger animation -- FIXME */
	}

	return {
		setColorScale: setColorScale,
		getAutoScale: getAutoScale,
		brush: plotBrush,
		sendBrushEvent: plotBrushBrush,
		selection: brushSelectForBM,
		updateMinMaxMarkers: updateMinMaxMarkers
	};
}

exports.histogram = histogram;

