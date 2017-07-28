import histogram from './histogram';
import dotplot from './dotplot';
import d3 from 'd3';
import naturalSort from 'javascript-natural-sort';
import autoscale from './auto-colorscale';
import utils from './utils';
import asyncBenchmark from './async-benchmark';
import { onData } from './colorscales';
import { createDataObj } from './dataObject';
import { chromosomesToCumulativeBPCounts,
         inlineKSData } from './chromosomeUtils';
const { debounced } = utils;

import './style.css';

import {
  RUN_BENCHMARKS,
  SHOW_MAXIMA_AND_MINIMA
} from './constants';

function buildDiv(element_id, show_histograms) {
  const div = d3.select(element_id)
    .append('div')
    .classed('_synteny-dotplot-builder', true);

  div.append('svg').attr('id', 'dotplot')
    .style('shape-rendering', 'crispEdges')
    .classed('dotplot', true);

  const subdiv = div.append('div').classed('dotplot', true);
  /* pointer-events = none stops the canvas from intercepting brush events
   * before they get to the svg element below. */
  subdiv.append('canvas')
    .attr('id', 'dotplot-canvas-background').classed('dotplot', true)
    .style('pointer-events', 'none');
  subdiv.append('canvas')
    .attr('id', 'dotplot-canvas').classed('dotplot', true)
    .style('pointer-events', 'none');

  if (show_histograms) {
    const histogramAndTopForm = div.append('div')
        .attr('id', 'histogram-and-top-form', true);

    const formWrapperTop = histogramAndTopForm
        .append('div').attr('id', 'form-wrapper-top');
    const buttonWrapper = formWrapperTop
      .append('div')
      .classed('histogram-button-wrapper', true);
    buttonWrapper.append('button')
      .classed('histogram-button', true)
      .attr('id', 'histogram-button-left')
      .text('<');
    buttonWrapper.append('div')
      .attr('id', 'histogram-button-title')
      .append('text')
      .attr('id', 'histogram-button-title-text');
    buttonWrapper.append('button')
      .classed('histogram-button', true)
      .attr('id', 'histogram-button-right')
      .text('>');

    const histogramWrapper = histogramAndTopForm
        .append('div').attr('id', 'histogram-wrapper');
    histogramWrapper.append('svg')
      .attr('id', 'plot')
      .style('shape-rendering', 'crispEdges')
      .classed('histogram', true);
    histogramWrapper.append('svg')
      .attr('id', 'plot2')
      .style('shape-rendering', 'crispEdges')
      .classed('histogram', true);
    histogramWrapper.append('svg')
      .attr('id', 'plot3')
      .style('shape-rendering', 'crispEdges')
      .classed('histogram', true);
  }

  const formWrapper = div.append('div').attr('id', 'form-wrapper');
  function makeForm(title, optionId, elements, checkIndex) {
    const navOptions = formWrapper
      .append('div')
      .classed('radio-button-box', true);
    if(title) {
      navOptions.append('text').text(title + ': ');
    }

    const navForm = navOptions.append('form').attr('id', optionId);
    const options = navForm.selectAll('input')
      .data(elements).enter().append('input')
      .attr('type', 'radio').attr('name', optionId)
      .attr('value', d => d[0]);

    options.forEach(function(selection) {
      selection.forEach(function(element, i) {
        const label = document.createElement('label');
        label.textContent = elements[i][1];
        navForm.node().insertBefore(label, element);
      });
    });
    options[0][checkIndex].checked = true;
  }


  if (show_histograms) {
    const option = (value, text) => [value, text];

    formWrapper.append('div')
      .attr('id', 'form-top-label')
      .append('strong').text('Plot Options');
    makeForm('Chromosome Order', 'order-options', [
      option('order-by-size', 'By Size'),
      option('order-by-name', 'By Name'),
      option('order-by-number', 'By Number')
      // order by match count doesn't work very well, drop for now
      // option('order-by-match', 'By Match Count') 
    ], 1);
    formWrapper.append('div')
      // .attr('id', 'form-top-label')
      .append('strong').text('Controls');
    makeForm('Navigation', 'mouse-options', [
      option('brush', 'Brushing'),
      option('pan', 'Panning')
    ], 0);
  
    formWrapper.append('div').style('height', '10');

    formWrapper.append('strong').text('Color Options');
    makeForm('Color Scale', 'color-options', [
      option('auto', 'auto'),
      option('rainbow_quantized', 'rainbow_quantized')
    ], 0);

    const persistenceOptions = formWrapper
      .append('div')
      .classed('radio-button-box', true);
    persistenceOptions.append('text').text('Auto-scale peak threshold: ');

    const initialPersistence = 50;
    persistenceOptions
      .append('input')
      .attr('id', 'persistence')
      .attr('type', 'range')
      .attr('min', 0)
      .attr('max', 100)
      .attr('value', initialPersistence)
      .attr('step', 1);

    persistenceOptions
      .append('label')
      .attr('id', 'persistence-text')
      .text(initialPersistence);
  }

  formWrapper.append('div').style('height', '10');
  formWrapper.append('strong').text('Point Selection');
  const gevoLink = formWrapper.append('div');
  gevoLink.append('div').attr('id', 'gevo-link-xname');
  gevoLink.append('div').attr('id', 'gevo-link-yname');
  gevoLink
    .append('button')
    .attr('id', 'gevo-link')
    .text('No Point Selected');
}


function controller(ksData, element_id, meta) {
  var chromosomeOrderFun, dataObj;

  function changeOrderFunAndRebuildDataObject(newOrderFun) {
    chromosomeOrderFun = newOrderFun;
    const xCumLenMap = chromosomesToCumulativeBPCounts(
      meta.genome_x.chromosomes, chromosomeOrderFun);

    const yCumLenMap = chromosomesToCumulativeBPCounts(
      meta.genome_y.chromosomes, chromosomeOrderFun);
    const inlinedKSData = inlineKSData(ksData, xCumLenMap, yCumLenMap);
    dataObj = createDataObj(inlinedKSData, xCumLenMap, yCumLenMap);
  }

  // compute per-chromosome match counts in x and y
  var xChromosomesById = {};
  var yChromosomesById = {};
  const initChromosome = dict => {
    return c => {
      dict[c.name] = c;
      c.matchCount = 0;
    };
  };
  meta.genome_x.chromosomes.forEach(initChromosome(xChromosomesById));
  meta.genome_y.chromosomes.forEach(initChromosome(yChromosomesById));
  ksData.forEach(d => {
    if (d.x_chromosome_id === undefined ||
        d.y_chromosome_id === undefined)
      return;
    xChromosomesById[d.x_chromosome_id].matchCount++;
    yChromosomesById[d.y_chromosome_id].matchCount++;
  });

  const orderFuns = {
    'order-by-size': (a, b) => -(a.length - b.length),
    'order-by-name': (a, b) => naturalSort(a.name, b.name),
    'order-by-match': (a, b) => -(a.matchCount - b.matchCount),
    'order-by-number': (a, b) => {
      var na = Number(a.name), nb = Number(b.name);
      if (isNaN(na)) {
        if (isNaN(nb)) {
          return a.name.localeCompare(b.name);
        } else {
          return 1;
        }
      } else {
        if (isNaN(nb)) {
          return -1;
        } else {
          return (na - nb);
        }
      }
    }
  };
  changeOrderFunAndRebuildDataObject(orderFuns['order-by-name']);

  console.log('Total synteny dots:', dataObj.currentData().raw.length);
  
  buildDiv('#' + element_id, meta.have_ks);

  const refreshPlot = debounced(100, function(colorScale) {
    syntenyPlot.setField(activeField);
    syntenyPlot.setColorScale(colorScale);
  });

  const refreshAutoScale = debounced(100, function(persistence) {
    const radio = document.getElementById('color-options');
    for(let child of radio.children) {
      if(child.value === 'auto') {
        child.checked = true;
      }
    }

    const bins = histograms[activeField].bins();
    const newAutoScale = autoscale.generateAutoScale(bins, persistence);

    histograms[activeField].setColorScale(newAutoScale);
    refreshPlot(newAutoScale);

    if (SHOW_MAXIMA_AND_MINIMA)
      histograms.forEach(h => h.updateMinMaxMarkers(persistence));
  });
 
  const getPersistence = () => d3.select('#persistence').node().value;

  d3.selectAll('#order-options input[name=order-options]')
    .on('change', function() {
      changeOrderFunAndRebuildDataObject(orderFuns[this.value]);
      rebuild();
    });

  d3.select('#persistence')
    .on('input', function() {
      const p = getPersistence();
      refreshAutoScale(p);
      d3.select('#persistence-text').node().innerText = p;
    });

  var syntenyPlot;
  /* zoom/pan switching */
  d3.selectAll('#mouse-options input[name=mouse-options]')
    .on('change', function() {
      syntenyPlot.setNavMode(this.value);
    });

  /* color mode switching */
  var activeField = 'logks';

  /* Don't be cute and use fat arrow functions here. Fat arrow functions
   * have a lexically bound "this" and we really really need the old "this"
   * scoping, since we are getting value from a form. */
  d3.selectAll('#color-options input[name=color-options]')
    .on('change', function() {
      var newCS;
      if (this.value === 'auto') {
        newCS = autoscale.generateAutoScale(
          histograms[activeField].bins(), getPersistence());
      } else {
        newCS = colorScale(activeField, this.value);
      }
      histograms[activeField].setColorScale(newCS);
      syntenyPlot.setColorScale(newCS);
    });

  const colorScale = onData(dataObj.currentData().raw);

  const initial = colorScale(activeField, 'rg');

  if (!meta.have_ks) {
    const scale = colorScale(activeField, 'unselected');
    const synteny = dotplot.synteny;
    syntenyPlot = synteny('#dotplot', dataObj, 'logks', scale, meta);
    syntenyPlot.setNavMode('pan');
    return;
  }

  function getInitialColorScale(histograms) {
    const activePlot = histograms[activeField];
    return autoscale.generateAutoScale(activePlot.bins(), getPersistence());
  }

  function setUpHistograms(initialCS) {
    d3.selectAll('.histogram').classed('hidden', false);
    const histograms = {
      'logks': histogram.histogram('#plot', dataObj, 'logks', initialCS),
      'logkn': histogram.histogram('#plot2', dataObj, 'logkn', initialCS),
      'logknks': histogram.histogram('#plot3', dataObj, 'logknks', initialCS)
    };
    const activePlot = histograms[activeField];

    const initialAutoScale = autoscale.generateAutoScale(activePlot.bins(),
      getPersistence());
    activePlot.setColorScale(initialAutoScale);

    Object.keys(histograms)
      .filter(name => name !== activeField)
      .forEach(name => {
        histograms[name].setColorScale(colorScale(name, 'unselected'));
      });
  
    //FIXME
    const name_map = {
      'logks': 'plot',
      'logkn': 'plot2',
      'logknks': 'plot3'
    };

    var which = 0;
    const other_smh = ['logks', 'logkn', 'logknks'];
    const names_smh = ['plot', 'plot2', 'plot3'];
    const scientific_names = [
      'Synonymous - ks',
      'Non-Synonymous - kn',
      'Non-Synonymous / Synonymous ratio - kn/ks'
    ];

    const common = () => {
      d3.selectAll('.histogram').classed('hidden', true);
      d3.select('#' + names_smh[which]).classed('hidden', false);
      activeField = other_smh[which];
      d3.select('#histogram-button-title-text').text(scientific_names[which]);
      refreshAutoScale(getPersistence());
    };
    d3.select('#histogram-button-left')
      .on('click', () => {
        which = (which + 2) % 3;
        common();
      });
    d3.select('#histogram-button-right')
      .on('click', () => {
        which = (which + 1) % 3;
        common();
      });

    d3.selectAll('.histogram').classed('hidden', true);
    d3.select('#' + name_map[activeField]).classed('hidden', false);
    d3.select('#histogram-button-title-text').text(scientific_names[which]);

    // Since the histograms aren't controlling their own color scale policy
    // now (a good thing), we need to manually fire of their update methods.
    // Eventually, we should fix this up.
    dataObj.addListener(function(typeHint) {
      if (typeHint.indexOf('stop') > -1 && SHOW_MAXIMA_AND_MINIMA)
        Object.values(histograms).forEach(h => {
          h.updateMinMaxMarkers(getPersistence());
        });
    });
    return histograms;
  }

  var histograms = setUpHistograms(initial);
  syntenyPlot = dotplot.synteny('#dotplot', dataObj, 'logks',
    getInitialColorScale(histograms), meta);

  dataObj.notifyListeners('initial');

  // Tear everything out and rebuild. Used for resizing and
  // chromosome reordering
  const rebuild = () => {
    ['dotplot', 'plot', 'plot2', 'plot3'].forEach(id => {
      const el = document.getElementById(id);
      while(el.firstChild) el.removeChild(el.firstChild);
    });
    dataObj.clearListeners();
    const cs = histograms[activeField].getColorScale();
    histograms = setUpHistograms(cs);
    syntenyPlot = dotplot.synteny('#dotplot', dataObj, activeField, cs, meta);
  };
  
  // Resize the window? Rebuild.
  window.onresize = rebuild;
  
  /* Benchmark */
  if (RUN_BENCHMARKS) {
    const [minLogKs, maxLogKs] = d3.extent(
      dataObj.currentData().raw, x => x.logks);
    const points = utils.samplePointsInRange([minLogKs, maxLogKs], 10);

    const grouped_pairs = points.map(lo => {
      return points.map(hi => [lo, hi]).filter(([lo, hi]) => lo < hi);
    });
    const pairs = Array.prototype.concat.apply([], grouped_pairs);

    asyncBenchmark.benchmark(pairs, function(range) {
      histograms.logks.brush.extent(range);
      histograms.logks.brush.event(histograms.logks.selection);
    }, function({average, max}) {
      alert('Average: ' + average + ', max: ' + max);
    });
  }
}

exports.controller = controller;


/* Local Variables:  */
/* mode: js2         */
/* js2-basic-offset: 2 */
/* End:              */
