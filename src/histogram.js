import {
  HISTOGRAM_MARGIN,
  HISTOGRAM_Y_SCALE_TRANS_LEN,
  NUM_HISTOGRAM_TICKS,
  UNSELECTED_BAR_FILL
} from './constants';

import persistenceFuncs from './persistence';
import utils from './utils';
import d3 from 'd3';
import transform from 'svg-transform';

function histogram(id, dataObj, field, colorScale) {
  const dataExtent = d3.extent(dataObj.currentData().raw.map(x => x[field]));

  const plot = d3.select(id);
  const plotWidth = () =>
    utils.getComputedAttr(document.getElementById(id.substring(1)), 'width');
  const plotHeight = () =>
    utils.getComputedAttr(document.getElementById(id.substring(1)), 'height');

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
    .range([HISTOGRAM_MARGIN, plotWidth() - HISTOGRAM_MARGIN]);

  const bins = utils.samplePointsInRange(dataExtent, NUM_HISTOGRAM_TICKS);
  const summaryF = dataObj.currentDataSummary(bins, field);
  const getYExtent = summary => [0, 3 / 2 * Math.max(...summary.map(x => x.y))];

  const yPlotScale = d3.scale.linear()
    .domain(getYExtent(summaryF()))
    .range([plotHeight() - HISTOGRAM_MARGIN, HISTOGRAM_MARGIN]);

  function updateMinMaxMarkers(persistence) {
    const summary = summaryF();
    const extrema = persistenceFuncs.simplify(summary, persistence);

    const isMaxima = (A, i) => A[i].y > Math.max(A[i - 1].y, A[i + 1].y);
    const shouldBeMarked = (x, i, A) =>
      i > 0 && i < A.length - 1 && isMaxima(A, i);
    const markers = extrema.map(function(d, i, A) {
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
    .data(summaryF())
    .enter()
    .append('rect').classed('dataBars', true)
    .attr('x', d => ~~(xPlotScale(d.x)))
    .attr('width', d => ~~(xPlotScale(d.x + d.dx)) - ~~(xPlotScale(d.x)));

  const brushSelectForBM = plot.append('g').attr('id', 'plotbrush-group')
    .attr('transform', transform([{translate: [0, HISTOGRAM_MARGIN]}]))
    .call(plotBrush);
  brushSelectForBM.selectAll('rect')
    .attr('height', plotHeight() - 2 * HISTOGRAM_MARGIN);

  const xAxis = d3.svg.axis().scale(xPlotScale).orient('bottom').tickSize(10);
  const yAxis = d3.svg.axis().scale(yPlotScale).orient('left').ticks(5);

  plot.append('g')
    .attr('transform',
      transform([{translate: [0, plotHeight() - HISTOGRAM_MARGIN]}]))
    .classed('xAxis', true).call(xAxis);
  const yAxisSel = plot.append('g')
    .attr('transform', transform([{translate: [HISTOGRAM_MARGIN, 0]}]))
    .classed('yAxis', true).call(yAxis);

  const updateHeights = function(selection) {
    //commented because it doesnt work on large datasets
    //selection.transition(); // cancel transition
    selection.attr('y', d => yPlotScale(d.y));
  };
  const updateColors = function(selection) {
    //commented because it doesnt work on large datasets
    //selection.transition(); // cancel transition
    const extent =
    plotBrush.empty() ? [-Infinity, Infinity] : plotBrush.extent();
    const active = bin => bin.x + bin.dx > extent[0] && bin.x < extent[1];

    const orZero = x => Math.max(x, 0);
    const height = plotHeight();
    selection
      .attr('height', d => orZero(height - HISTOGRAM_MARGIN - yPlotScale(d.y)))
      .attr('fill', d => {
        return active(d) ? colorScale(d.x + d.dx / 2) : UNSELECTED_BAR_FILL;
      });
  };

  const updatePlotAttrs = function(selection) {
    updateHeights(selection);
    updateColors(selection);
  };

  function updatePlot(typeHint) {
    dataBarSel.transition(); /* cancel previous transition */

    typeHint = typeHint || '';
    const summary = summaryF();

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

  function getColorScale() {
    return colorScale;
  }

  return {
    setColorScale: setColorScale,
    getColorScale: getColorScale,
    brush: plotBrush,
    sendBrushEvent: plotBrushBrush,
    selection: brushSelectForBM,
    updateMinMaxMarkers: updateMinMaxMarkers,
    bins: summaryF
  };
}

exports.histogram = histogram;

