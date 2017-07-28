import crossfilter from 'crossfilter';
import { zipObject } from './utils';
import { Tree } from './bvhTree';


function createDataObj(syntenyDots, xmapPair, ymapPair) {
  const xmap = xmapPair.nt; //nt = {chromosomeName:total} ?
  const ymap = ymapPair.nt;
  const ret = {};

  const cross = crossfilter(syntenyDots);
  const cross_all = cross.dimension(x => x.logks);
  const cross_x = cross.dimension(x => x.x_relative_offset);
  const cross_y = cross.dimension(x => x.y_relative_offset);
  const fields = ['logks', 'logkn', 'logknks'];

  //a dict of { field: cross.dimension(field) }
  const filters = zipObject(
    fields,
    fields.map(field => cross.dimension(x => x[field]))
  );

  ret.tree = new Tree(syntenyDots, 3000);
  //console.log(ret.tree._dumpNodes());

  ret.getXLineOffsets = () => Object.values(xmap).sort((a, b) => a - b);

  ret.getYLineOffsets = () => Object.values(ymap).sort((a, b) => a - b);

  ret.getXLineNames = function() {
    return filterMapForNames(xmap);
  };

  ret.getYLineNames = function() {
    return filterMapForNames(ymap);
  };

  function filterMapForNames(map) {
    return Object.keys(map)
      .sort((a, b) => map[a] - map[b])
      .filter(x => x !== 'total');
  }

  ret.currentData = function currentData(viewBox=null) {
    if(viewBox === null){
      return {
        raw: syntenyDots,
        active: cross_all.top(Infinity)
      };
    }else{
      return {
        raw: syntenyDots,
        active: ret.tree.dotsIn(viewBox, cross_all.top(Infinity))
      };
    }
  };

  ret.currentDataSummary = function currentDataSummary(raw_ticks, field) {
    const ticks = raw_ticks.map(x => x).sort((a, b) => a - b);
    const group = filters[field].group(x => ticks.find(t => t >= x));
    const dx = ticks[1] - ticks[0];

    return function() {
      const groupList = group.top(Infinity);
      const groups = zipObject(
        groupList.map(x => x.key),
        groupList.map(x => x.value)
      );

      return ticks.map(
        tick => ({
          x: Number(tick),
          y: Number(groups[tick] || 0),
          dx
        })
      );
    };


  };

  ret.addSpatialFilter = function(extents, typeHint) {

    cross_x.filter([extents[0][0], extents[1][0]]);
    cross_y.filter([extents[0][1], extents[1][1]]);
    ret.notifyListeners(typeHint);
  };

  ret.removeSpatialFilter = function(typeHint) {
    cross_x.filterAll();
    cross_y.filterAll();
    ret.notifyListeners(typeHint);
  };

  ret.addDataFilter = function(extent, field, typeHint) {
    filters[field].filter(extent);
    ret.notifyListeners(typeHint || 'data');
  };

  ret.removeDataFilter = function(field) {
    filters[field].filterAll();
    ret.notifyListeners('data-stop');
  };

  const listeners = [];
  ret.addListener = function(x) {
    listeners.push(x);
  };
  ret.clearListeners = function() {
    while(listeners.length > 0) listeners.pop();
  };

  ret.notifyListeners = function(typeOfChange) {
    listeners.forEach(f => f(typeOfChange));
  };

  return ret;
}

exports.createDataObj = createDataObj;

/* Local Variables:  */
/* mode: js2         */
/* js2-basic-offset: 2 */
/* End:              */
