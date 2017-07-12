function Node(top, bottom, left, right, start, stop, children){
  this.box = {top, bottom, left, right};
  this.range = {start, stop};
  this.children = children;
  this.size = stop-start; //data array length
}


//bounding volume hierarchy tree
function Tree(dots, maxDotsPerNode=2000){

  //build tree
  dots = dots.slice();
  dots.sort(byX);

  var left = dots[0].x_relative_offset;
  var right = dots[dots.length-1].x_relative_offset;
  var top, bottom;
  for(var i=0; i<dots.length; i++){
    if(top === undefined || dots[i].y_relative_offset > top){
      top = dots[i].y_relative_offset;
    }
    if(bottom === undefined || dots[i].y_relative_offset < bottom){
      bottom = dots[i].y_relative_offset;
    }
  }

  var rootNode = new Node(top, bottom, left, right, 0, dots.length, null);
  [rootNode,dots] = splitNodeRecursively(rootNode, dots, maxDotsPerNode);
  
  this.rootNode = rootNode;
  this.dots = dots;


  //method
  //tree.dotsIn(box)
  this.dotsIn = function(viewBox){
    var ranges = dotsRange(this.rootNode, viewBox);
    var res = dotsFromRanges(this.dots, ranges);
    return res;
  };
}


function dotsRange(node, viewBox){
  var relation = boxRelation(node.box, viewBox);
  var ranges = [];
  //debug
  /*
  var b1 = drawBox(node.box,'red');
  var b2 = drawBox(viewBox,'blue');
  console.log(relation);
  debugger;
  b1.remove();
  b2.remove();
  */
  if(relation === 'A<=B'){
    ranges.push(node.range);
  }else if(relation === 'A>=B' || relation === 'partialOverlap'){
    if(node.children !== null){
      for(var i=0; i<node.children.length; i++){
        ranges = ranges.concat(dotsRange(node.children[i], viewBox));
      }
    }else{////node.children == null
      ranges.push(node.range);
    }
  }
  return ranges;
}


function dotsFromRange(dots, range){
  return dots.slice(range.start, range.stop);
}

function dotsFromRanges(dots, ranges){
  var range;
  var res = [];
  for(var i=0; i<ranges.length; i++){
    range = ranges[i];
    res = res.concat(dotsFromRange(dots, range));
  }
  return res;
}


function boxRelation(boxA, boxB){
  var t1 = boxA.top;
  var b1 = boxA.bottom;
  var l1 = boxA.left;
  var r1 = boxA.right;

  var t2 = boxB.top;
  var b2 = boxB.bottom;
  var l2 = boxB.left;
  var r2 = boxB.right;

  if(r2 < l1 || r1 < l2 || t1 < b2 || t2 < b1){
    return 'disjoint';
  }
  if(t2 <= t1 && b2 >= b1 && l2 >= l1 && r2 <= r1){
    return 'A>=B';
  }
  if(t1 <= t2 && b1 >= b2 && l1 >= l2 && r1 <= r2){
    return 'A<=B'; //A contained in B
  }
  
  if((t1 >= b2 && t1 <= t2)
  || (b1 >= b2 && b1 <= t2)
  || (l1 >= l2 && l1 <= r2)
  || (r1 >= l2 && r1 <= r2)){
    return 'partialOverlap';
  }
  return 'error';
}


function byX(a,b){
  return a.x_relative_offset - b.x_relative_offset;
}

function byY(a,b){
  return a.y_relative_offset - b.y_relative_offset;
}


function sortedSubArray(arr, start=0, stop=null, sortMethod=null){
  if (stop === null) stop = arr.length;
  var sortedSub;
  if (sortMethod === null){
    sortedSub = arr.slice(start, stop).sort();
  }else{
    sortedSub = arr.slice(start, stop).sort(sortMethod);
  }
  var arrHead = arr.slice(0,start);
  var arrTail = arr.slice(stop,arr.length);
  return arrHead.concat(sortedSub).concat(arrTail);
}



function findIndexOf(value, arr, start, stop){
  //binary search
  //return 0;
  var stop0 = stop;
  var start0 = start;

  var probe;
  while(start != stop-1){
    probe = Math.round(start/2+stop/2);
    if (arr[probe] <= value){
      start = probe;
    }else{
      stop = probe;
    }
  }

  
  if(value < arr[start]){
    probe = start;
  }else{
    probe = stop;
  }
  return probe;
  

/*
//linear search
  if (value < arr[start]) {
    return start;
  }else{
    for(var i=start; i<stop; i++){
      if (arr[i] < value && value < arr[i+1]){
        return i+1;
      }
    }
  }
  return stop;*/

}


function splitNode(node, dots, method){

  var box = node.box;
  var left = box.left;
  var right = box.right;
  var top = box.top;
  var bottom = box.bottom;

  var start = node.range.start;
  var stop = node.range.stop;

  dots = sortedSubArray(dots, start, stop, method);

  var boxMiddle;
  var node1, node2;
  var indexSplit;

  if(method === byX){
    var xValues = dots.map(function(d){
      return d.x_relative_offset;
    });
    boxMiddle = left/2 + right/2;
    indexSplit = findIndexOf(boxMiddle, xValues, start, stop);
    node1 = new Node(top, bottom, left, boxMiddle,      
      start, indexSplit, null);
    node2 = new Node(top, bottom, boxMiddle, right, 
      indexSplit, stop, null);

  }else if(method === byY){
    var yValues = dots.map(function(d){
      return d.y_relative_offset;
    });
    boxMiddle = top/2 + bottom/2;
    indexSplit = findIndexOf(boxMiddle, yValues, start, stop);
    node1 = new Node(boxMiddle, bottom, left, right,
      start, indexSplit, null);
    node2 = new Node(top, boxMiddle, left, right, 
      indexSplit, stop, null);
  }

  var res = {};
  res.nodes = [node1, node2];
  res.dots = dots;
  return res;
}


function splitNodeRecursively(node, dots, maxDotsPerNode=2000){
//make tree recursively

//return [node, dots];
//node - the same node as argument(with children added)
//dots - permuted dots

  var splitMethod;
  if(node.size <= maxDotsPerNode){
    return [node, dots];
  }else{
    //split box relatively square
    if(node.box.right-node.box.left > node.box.top-node.box.bottom){
      splitMethod = byX;
    }else{
      splitMethod = byY;
    }

    var splitResult = splitNode(node, dots, splitMethod);
    node.children = splitResult.nodes;
    dots = splitResult.dots;
    for(var i=0; i<node.children.length; i++){
      [node.children[i],dots] 
        = splitNodeRecursively(node.children[i], dots, maxDotsPerNode);
    }
    return [node, dots];
  }
  return 'error';
}


function getLeaveNodes(node){
  if(node.children === null){
    return [node];
  }else{
    var res = [];
    for(var i=0; i<node.children.length; i++){
      res = res.concat(getLeaveNodes(node.children[i]));
    }
  }
  return res;
}

exports.Tree = Tree;

