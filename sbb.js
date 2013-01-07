/**
 * Copyright 2013 Daniel Alder, Switzerland
 * https://github.com/daald/Visual-Timetable
 *
 * This file is part of Visual Timetable.
 *
 * Visual Timetable is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * Foobar is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * Visual Timetable. If not, see http://www.gnu.org/licenses/.
 **/

//////////////////////////////////////// MINI LIB
function avg(v1, v2, w) {
  if (!w) w = .5;
  return (v2 - v1) * w + v1;
}

// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.com/#x15.4.4.18
if ( !Array.prototype.forEach ) {
  Array.prototype.forEach = function forEach( callback, thisArg ) {
    var T, k;
    if ( this == null ) {
      throw new TypeError( "this is null or not defined" );
    }
    // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
    var O = Object(this);
    // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = O.length >>> 0; // Hack to convert O.length to a UInt32
    // 4. If IsCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if ( {}.toString.call(callback) !== "[object Function]" ) {
      throw new TypeError( callback + " is not a function" );
    }
    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
    if ( thisArg ) {
      T = thisArg;
    }
    // 6. Let k be 0
    k = 0;
    // 7. Repeat, while k < len
    while( k < len ) {
      var kValue;
      // a. Let Pk be ToString(k).
      //   This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
      //   This step can be combined with c
      // c. If kPresent is true, then
      if ( Object.prototype.hasOwnProperty.call(O, k) ) {
        // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
        kValue = O[ k ];
        // ii. Call the Call internal method of callback with T as the this value and
        // argument list containing kValue, k, and O.
        callback.call( T, kValue, k, O );
      }
      // d. Increase k by 1.
      k++;
    }
    // 8. return undefined
  };
}
if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}


//////////////////////////////////////// START FUNCTION
$(function(){
  // Autocomplete for station fields
  $( "input.stationfield" ).autocomplete({
    source: function( request, response ) {
      $.ajax({
        url: "http://transport.opendata.ch/v1/locations",
        dataType: "json",
        data: {
          query: request.term
        },
        success: function( data ) {
          response( $.map( data.stations, function( item ) {
            return {
              label: item.name,
              value: item.name
            }
          }));
        }
      });
    },
    minLength: 3,
    select: function( event, ui ) {
      //alert( ui.item ?
      //    "Selected: " + ui.item.label :
      //    "Nothing selected, input was " + this.value);
    },
  });

  // other configurations

  var board = new TimeTableBoard();

  $('#updateBtn').click(function(event) {
    event.preventDefault();

    board.refresh();
  });

  $('#swap').click(function(event) {
    event.preventDefault();

    var from = $('[name=from]');
    var to   = $('[name=to]'  );
    var tmp = from.val();
    from.val(to.val());
    to.val(tmp);

    var from = $('[name=connFrom]');
    var to   = $('[name=connTo]'  );
    var tmp = from.val();
    from.val(to.val());
    to.val(tmp);

    var from = $('[name=connFromGap]');
    var to   = $('[name=connToGap]'  );
    var tmp = from.val();
    from.val(to.val());
    to.val(tmp);

    board.refresh();
  });

  $('#save').click(function(event) {
    event.preventDefault();

    var content = '<?xml version="1.0" standalone="no"?>\n';
    content += '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"\n';
    content += '  "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n';
    content += $('#timetable').html();
    var uriContent = "data:image/svg+xml," + encodeURIComponent(content);
    //var uriContent = "data:application/octet-stream," + encodeURIComponent(content);
    var newWindow = window.open(uriContent, 'timetable.svg');
  });

  $('#ctlEnlarge').click(function(event) {
    event.preventDefault();
    board.connNum++;
    $('[name=numConns]').val(board.connNum);
    board.updateHash();
    board.redraw();
  });

  $('#ctlShrink').click(function(event) {
    if (board.connNum <= 1) return;
    event.preventDefault();
    board.connNum--;
    $('[name=numConns]').val(board.connNum);
    board.updateHash();
    board.redraw();
  });

  $('#ctlShiftLeft').click(function(event) {
    event.preventDefault();
    board.navigate(-1);
  });

  $('#ctlShiftRight').click(function(event) {
    event.preventDefault();
    board.navigate(+1);
  });

  /***
   * Control Panel
   */
  var timeout;
  function hidepanel() {
    $("#timetable-buttons").slideUp();
  }
  $("#timetable-buttons").hide();
  $("#timetable, #timetable-buttons").hover(
    function(){
      // .position() uses position relative to the offset parent, 
      var pos = $("#timetable").offset();
      // .outerWidth() takes into account border and padding.
      //var width = $(this).outerWidth();
      //show the menu directly over the placeholder
      $("#timetable-buttons").css({
        "position":"absolute",
      //}).offset({
        top: pos.top,
        left: (pos.left+100),
      });

      $("#timetable-buttons").stop(true, true).fadeTo('fast', 1);//.delay(10000).fadeOut('slow');
    },
    function(){
      //clearTimeout(timeout);
      //timeout = setTimeout(hidepanel, 3000);
      $("#timetable-buttons").stop(true, true).delay(4000).fadeOut('slow');
    }   
  );

  // initial parameters
  board.initFromHash();

  // initial display
  board.refresh();
});


/*******************************************************************************
 *** cache function
 */
var cachePool = {};
function cache(key, value) {
  if (value === undefined)
    return cachePool[key];

  cachePool[key] = value;
}


/*******************************************************************************
 *** MinMax object
 */
function MinMax() {
  this.min = NaN;
  this.max = NaN;
}

MinMax.prototype.update = function(v) {
  if (isNaN(this.min) || this.min > v) this.min = v;
  if (isNaN(this.max) || this.max < v) this.max = v;
}

MinMax.prototype.toString = function() {
  return this.min + '..' + this.max;
}

/*******************************************************************************
 *** ConnectionLoader object
 */
function ConnectionLoader() {
  this.conns = [];
  this.tTotalStartMM = new MinMax();
  this.tTotalEndMM   = new MinMax();
  this.tAbsoluteMinFetch = undefined;
}

ConnectionLoader.prototype.update = function(from, to, time, callbackObject) {
  this.from = from;
  this.to = to;
  this.callbackObject = callbackObject;

  this.fetchCount = 0;

  this.load(time);
}

ConnectionLoader.prototype.load = function(time, secondCall) {
  if (this.fetchCount++ > 15) {
    alert('Program bug detected. Assuming an infinite loop. Aborting');
    return;
  }

  var timeVal = time.getTime()
  var shortCutSmaller=false, shortCutLarger=false;
  this.conns.forEach(function(conn, cid) {
    //if (conn.tMin < timeVal) shortCutSmaller = true;
    if (conn.tMin > timeVal) shortCutLarger  = true;
  });
  if (this.tAbsoluteMinFetch <= timeVal && this.tAbsoluteMinFetch)
    shortCutSmaller = true;
  if (shortCutSmaller && shortCutLarger) {
    console.log('[L.l] using cached result instead of AJAX call');
    this.handleData({saved: true, connections: []}, secondCall);
    return;
  }

  if ((!this.tAbsoluteMinFetch) || this.tAbsoluteMinFetch > timeVal) this.tAbsoluteMinFetch = timeVal;

  var tStr = time.format('HH:MM')
  var dStr = time.format('yyyy-mm-dd')

  var queryStr = 'from='+this.from+'&to='+this.to+'&date='+dStr+'&time='+tStr+'&limit=6';
  var loader = this;
  console.log('[L.l] fire ajax: ', queryStr);
  $.ajax({
    type: 'GET',
    url: 'http://transport.opendata.ch/v1/connections',
    dataType: 'json',
    data: queryStr
  }).done( function(json) {
    loader.handleData(json, secondCall);
  }).fail( function( xmlHttpRequest, statusText, errorThrown ) {
    alert(
      "Your form submission failed.\n\n"
        + "XML Http Request: " + JSON.stringify( xmlHttpRequest )
        + ",\nStatus Text: " + statusText
        + ",\nError Thrown: " + errorThrown );
  });
}

ConnectionLoader.prototype.handleData = function(json, secondCall) {
  /** callbackObject contains:
   * names        function(from, to) : correct station names from provider
   * start        function()
   * rangeFn      function(conn, cid) -> true=include to result list
   * update       function(rangecons) -> ret -1 = backwards / ret 1 = forward
   * end          function(rangecons)
   */
  console.log('[L.hd]', json);
  if (!secondCall && !json.saved) {
    this.from = json.from.name;
    this.to   = json.to.name;
    var key = this.from + '/' + this.to;
    cache(key, this);//now we know the real station names
    if (this.callbackObject.names) {
      this.callbackObject.names(this.from, this.to);
      this.callbackObject.names = undefined;
    }
  }

  if (!secondCall) {
    if (this.callbackObject.start) {
      this.callbackObject.start();
      this.callbackObject.start = undefined;
    }
  }

  // create objects, adjust min/max
  var mergelist = [];
  json.connections.forEach(function(jsonconn, cid) {
    var conn = new Connection(jsonconn);
    mergelist.push(conn);
    this.tTotalStartMM.update(conn.tMin);
    this.tTotalEndMM.update(conn.tMax);
  }, this);

  if (mergelist.length == 0 && !json.saved) {
    alert('Server returned empty answer');
    if (this.callbackObject.end)
      this.callbackObject.end(this.conns);
    return;
  }

  this.conns = this.mergeNewConnections(this.conns, mergelist);

  if (this.callbackObject.rangeFn) {
    var range = [];
    this.tCurStartMM = new MinMax();
    this.tCurEndMM   = new MinMax();
    this.conns.forEach(function(conn, cid) {
      if (this.callbackObject.rangeFn(conn, range.length)) {
        range.push(conn);
        this.tCurStartMM.update(conn.tMin);
        this.tCurEndMM.update(conn.tMax);
      }
    }, this);
  } else {
    var range = this.conns;
    this.tCurStartMM = this.tTotalStartMM;
    this.tCurEndMM   = this.tTotalEndMM;
  }

  var needMore = 0;
  if (this.callbackObject.update)
    needMore = this.callbackObject.update(range);

  console.log('[L.hd] needMore', needMore);
  if (needMore == 1) {
    var tMinLatest = this.tCurStartMM.max;
    var d = new Date(tMinLatest);
    console.log('[L.hd] tMinLatest', tMinLatest, d);
    this.load(d);
  } else if (needMore == -1) {
    var tNextMin = this.tTotalStartMM.min;
    if (this.tAbsoluteMinFetch < tNextMin) tNextMin = this.tAbsoluteMinFetch; // avoids fetching the same range multiple times
    // minus 75% of the average time between 5 connections
    tNextMin -= (this.tTotalStartMM.max-this.tTotalStartMM.min) / this.conns.length * 5 * 0.75;
    var d = new Date(tNextMin);
    console.log('[L.hd] tNextMin', tNextMin, d);
    this.load(d);
  } else {
    if (this.callbackObject.end)
      this.callbackObject.end(range);
  }

  console.log('[L.hd] count',    range.length, 'of', this.conns.length);
  console.log('[L.hd] tTotal* ', this.tTotalStartMM, this.tTotalEndMM);
  console.log('[L.hd] tCur*   ', this.tCurStartMM,   this.tCurEndMM);
}

ConnectionLoader.prototype.mergeNewConnections = function(baselist, mergelist) {
  // b=baselist m=mergelist
  var outlist = [];

  console.log('[L.m] merging ', baselist.length, ' old connections with ', mergelist.length, ' new connections' );

  var iB = 0;
  var iM = 0;
  while (true) {
    var cB, cM, tB, tM;
    if (iB < baselist.length) {
      cB = baselist[iB];
      tB = cB.tMin;
    } else {
      cB = undefined;
    }
    if (iM < mergelist.length) {
      cM = mergelist[iM];
      tM = cM.tMin;
    } else {
      cM = undefined;
    }

    if ( (!cB) && (!cM) ) break; // finished.

    if ( (!cM) || ((cB) && (tB < tM)) ) {
      // base is next
      outlist.push(cB);
      iB++;
    } else if ( (!cB) || ((cM) && (tM < tB)) ) {
      // mergelist is next
      outlist.push(cM);
      iM++;
    } else {
      // both have the same time
      /**
       * we check all elements with the same time in this run. we primarily take
       * mergelist and overtake some graphics-relevant information from baselist.
       */
      for ( ; iM < mergelist.length && (cM=mergelist[iM]).tMin == tM; iM++ ) {
        for ( var iiB = iB; iiB < baselist.length && (cB=baselist[iiB]).tMin == tM; iiB++ ) {
          if (cB.merged || !cM.equals(cB)) continue;

          cM.mergeFrom(cB);
          cB.merged = true;
          outlist.push(cM);
          break;
        }
      }
      /**
       * finally we add all baselist entries which were not used yet
       */
      for ( ; iB < baselist.length && (cB=baselist[iB]).tMin == tM; iB++ ) {
        if (cB.merged) continue;

        outlist.push(cB);
      }
    }
  }
  console.log('[L.m] merge result: ', outlist.length, ' total connections' );
  return outlist;
}


/*******************************************************************************
 *** TimeTableBoard object
 */
function TimeTableBoard() {
  this.offsetY = 20;
  this.offsetX0 = 20;

  this.offsetX0 = 40; // X of first connection
  this.connWidth = 100;
  this.connSpace = 10;
  this.connNum = 6;

  $('#timetable').empty();
  this.R = Raphael('timetable', this.w, this.h);

  this.connsBefore = [];
  this.connsAfter  = [];
  this.conns       = [];

  //var tMin, tMax;
  //var tOff, tScale;
  //var ox0;

  this.gridSet = undefined;
}

TimeTableBoard.prototype.initFromHash = function() {
  //from: http://stackoverflow.com/questions/3234125/creating-array-from-window-location-hash
  var hash = window.location.hash.slice(1);
  var array = hash.split("&");
  var values, form_data = {};
  for (var i = 0; i < array.length; i += 1) {
    values = array[i].split("=");
    form_data[values[0]] = values[1];
  }

  console.log('saved state:', form_data);

  var fields = ['from', 'to', 'date', 'time', 'connFrom', 'connFromGap', 'connTo', 'connToGap', 'numConns'];

  initialized = false;
  for ( var i=0; i<fields.length; i++ ) {
    var f = $('[name='+fields[i]+']');
    if (form_data[fields[i]])
      f.val(form_data[fields[i]]);

    if (f.val() && fields[i] != 'numConns')
      initialized = true;
  }

  if (!initialized) {
    $('[name=from]').val('Zürich Altstetten');
    $('[name=to]').val('Uster');
    $('[name=connTo]').val('Uster, Weidli');
  }

  var v = $('[name=numConns]').val();
  if (v >= 1)
    this.connNum = v;
}

TimeTableBoard.prototype.updateHash = function() {
  // Unfortunately, this function make an infinite loop on htmlpreview.github.com
  if (window.location.href.startsWith('http://htmlpreview.github.com/'))
    return;

  var fields = ['from', 'to', 'date', 'time', 'connFrom', 'connFromGap', 'connTo', 'connToGap', 'numConns'];
  var hash = '';
  for ( var i=0; i<fields.length; i++ ) {
    var v = $('[name='+fields[i]+']').val();
    if (!v) continue;

    if (hash == '') hash = '#'; else hash += '&';
    hash += fields[i] + '=' + v;
  }
  window.location.hash = hash;

  $(document).attr('title', 'SBB ' + this.from + ' -> ' + this.to );
}

TimeTableBoard.prototype.getLoader = function(from, to, time) {
  var key = from + '/' + to;
  var loader = cache(key);
  if (!loader) {
    console.log('[B.getLoader]', key, 'nocache');
    loader = new ConnectionLoader();
    cache(key, loader);
  } else
    console.log('[B.getLoader]', key, 'cache hit');

  return loader;
}

TimeTableBoard.prototype.refresh = function() {
  var board = this;

  $('#timetable').empty();
  this.R = Raphael('timetable', this.w, this.h);

  this.from = $('[name=from]').val();
  this.to   = $('[name=to]'  ).val();
  this.time = this.parseUIDateTime( $('[name=date]'), $('[name=time]') );
  this.timeVal = this.time.getTime();

  board.updateHash();

  this.mainLoader = this.getLoader(this.from, this.to);
  this.mainLoader.update(this.from, this.to, this.time, {
    names: function(from, to) {
      board.from = from;
      $('[name=from]').val(from);
      board.to = to;
      $('[name=to]'  ).val(to);
      board.updateHash();
    },
    start: function() {
      console.log('[B.hmcS]');
      board.conns.forEach(function(conn) {
        conn.undraw(board);
      });
      board.conns = [];
    },
    rangeFn: function(conn, cid) {
      return (conn.tMin >= board.timeVal) && (cid < board.connNum);
    },
    update: function(conns) {
      board.conns = conns;
      board.redraw();

      if (board.conns.length < board.connNum)
        return 1;
    },
    afterSteps: function(conns) {
      if (board.conns.length < board.connNum)
        return 1;
    },
    end: function() {
      console.log('[B.hmcE]');
      board.processNextFetchJob(true);
    }
  });
}

TimeTableBoard.prototype.redraw = function() {
  var board = this;

  this.h = 480;
  this.w = this.offsetX0 + this.connWidth * this.connNum;

  if (!board.mainLoader) return;

  if (this.R) this.R.setSize(this.w, this.h);

  console.log('[B.rd]');

  board.tMax = NaN;
  board.tMin = NaN;
  board.conns.forEach(function(conn, cid) {
    if (isNaN(board.tMin) || board.tMin > conn.tMin)
      board.tMin = conn.tMin;
    if (isNaN(board.tMax) || board.tMax < conn.tMax)
      board.tMax = conn.tMax;

    if (conn.cBefore && board.tMin > conn.cBefore.tMin)
      board.tMin = conn.cBefore.tMin;
    if (conn.cAfter && board.tMax < conn.cAfter.tMax)
      board.tMax = conn.cAfter.tMax;
  }, this);

  console.log('[B.rd] tMin', board.tMin);

  board.tScale = (board.h-board.offsetY*2) / (board.tMax-board.tMin);
  board.tOff = board.tMin - board.offsetY/board.tScale;

  board.drawGrid()

  board.conns.forEach(function(conn, cid) {
    conn.draw(board, cid, true);
    if (conn.cBefore) conn.cBefore.draw(board, cid, false);
    if (conn.cAfter)  conn.cAfter.draw(board, cid, false);
  }, this);
}

TimeTableBoard.prototype.navigate = function(leftright) {
  var board = this;
  var nextLeft = NaN;
  var nextRight = NaN;

  board.mainLoader.conns.forEach(function(conn, cid) {
    if (conn.tMin < board.timeVal) nextLeft = conn.tMin;
    if (conn.tMin > board.timeVal && isNaN(nextRight)) nextRight = conn.tMin;
  }, this);

  var next;
  if (leftright == -1 && !isNaN(nextLeft))
    next = nextLeft;
  if (leftright == +1 && !isNaN(nextRight))
    next = nextRight;

  if (!next) return;

  var date = new Date(next);
  $('[name=date]').val(date.format('yyyy-mm-dd'));
  $('[name=time]').val(date.format('HH:MM'));

  this.refresh();
}

TimeTableBoard.prototype.parseUIDateTime = function(dRef, tRef) {
  var date = new Date();
  var s, dFmt, tFmt;

  if (s = dRef.val() )
    dFmt = date.setUIDate( s );
  if (s = tRef.val() )
    tFmt = date.setUITime( s );

  if (dFmt)
    dRef.val(date.format(dFmt));
  else
    dRef.val(date.format('yyyy-mm-dd'));
  if (tFmt)
    tRef.val(date.format(tFmt));
  else
    tRef.val(date.format('HH:MM'));

  return date;
}

TimeTableBoard.prototype.getConnConnsBefore = function(stationField, stationGap) {
  var board = this;

  board.connFrom    = stationField.val();
  board.connFromGap = stationGap.val()*60000; // [ms]
  if (!this.connFrom) return;

  var date1 = new Date(board.mainLoader.tCurStartMM.min - board.connFromGap * 3);

  this.beforeLoader = this.getLoader(this.connFrom, this.from);
  this.beforeLoader.update(this.connFrom, this.from, date1, {
    names: function(from, to) {
      board.connFrom = from;
      stationField.val(from);
      board.updateHash();
    },
    update: function(conns) {
      console.log('[B.-1.c] connections', conns);

      var foundAll = board.connectConnections(board.conns, board.beforeLoader.conns, {
        rate: function(mconn, cconn) {
          if (mconn.tMin - board.connFromGap < cconn.tMax)
            return -1; // not useable

          return mconn.tMin - board.connFromGap - cconn.tMax; // [ms] of waiting time
        },
        cmp: function(conn1, conn2) {
          return (conn1.tLength - conn2.tLength);
        },
        set: function(mconn, cconn) {
          if (mconn.cBefore) mconn.cBefore.undraw();

          // we need this for the case that one connection is drawn multiple times:
          cconn = $.extend({}, cconn); //clone(cconn);

          mconn.cBefore = cconn;
          cconn.draw(board, mconn.col, false);
        },
        get: function(mconn) {
          return mconn.cBefore;
        },
      });
      if (!foundAll)
        return -1;
      else if (board.mainLoader.tCurStartMM.max>board.beforeLoader.tTotalStartMM.max)
        return +1;

      return 0;
    },
    end: function(conns) {
      board.redraw();
      board.processNextFetchJob();
    },
  });
}

TimeTableBoard.prototype.getConnConnsAfter = function(stationField, stationGap) {
  var board = this;

  this.connTo    = stationField.val();
  this.connToGap = stationGap.val()*60000; // [ms]
  if (!this.connTo) return;

  var date1 = new Date(board.mainLoader.tCurEndMM.min + board.connToGap);

  this.afterLoader = this.getLoader(this.to, this.connTo);
  this.afterLoader.update(this.to, this.connTo, date1, {
    names: function(from, to) {
      board.connTo = to;
      stationField.val(to);
      board.updateHash();
    },
    update: function(conns) {
      console.log('[B.+1.c] connections', conns);

      var foundAll = board.connectConnections(board.conns, board.afterLoader.conns, {
        rate: function(mconn, cconn) {
          if (mconn.tMax + board.connToGap > cconn.tMin)
            return -1; // not useable

          return cconn.tMin - (mconn.tMax + board.connToGap); // [ms] of waiting time
        },
        cmp: function(conn1, conn2) {
          return (conn1.tLength - conn2.tLength);
        },
        set: function(mconn, cconn) {
          if (mconn.cAfter) mconn.cAfter.undraw();

          // we need this for the case that one connection is drawn multiple times:
          cconn = $.extend({}, cconn); //clone(cconn);

          mconn.cAfter = cconn;
          cconn.draw(board, mconn.col, false);
        },
        get: function(mconn) {
          return mconn.cAfter;
        },
      });
      if (!foundAll || board.mainLoader.tCurEndMM.max>board.afterLoader.tTotalStartMM.max-board.connToGap*3)
        return +1;

      return 0;
    },
    end: function(conns) {
      board.redraw();
      board.processNextFetchJob();
    },
  });
}

TimeTableBoard.prototype.connectConnections = function(mconns, cconns, callbackObject) {
  console.log('[B.cc]');

  var foundAll = true;

  /** callbackObject contains:
   * rate  function(mconn, cconn) -> gap [ms]
   * cmp   function(conn1, conn2) -> (<0)=(<) 0=(==) (>0)=(>)
   * set   function(mconn, cconn)
   * get   function(mconn) -> cconn
   */

  // mconns: main connections
  // cconns: connecting connections

  for ( var mcid in mconns ) {
    var mconn = mconns[mcid];

    var bestC = callbackObject.get(mconn);
    var bestR = NaN;
    if (bestC)
      bestR = callbackObject.rate(mconn, bestC);

    for ( var ccid in cconns ) {
      var cconn = cconns[ccid];

      r = callbackObject.rate(mconn, cconn);
      if (r < 0) continue; // out of range

      //console.log('[B.cc]', 'bestC', bestC, 'bestR', bestR, 'mconn', mconn, 'cconn', cconn, 'r', r);

      if (isNaN(bestR) || r < bestR || (r == bestR && callbackObject.cmp(cconn, bestC)<0 )) {
        bestR = r;
        bestC = cconn;
        //console.log('[B.cc] -', 'bestC', bestC, 'bestR', bestR);
      }
    }
    //console.log('[B.cc] =', 'bestC', bestC, 'bestR', bestR);
    if (callbackObject.get(mconn) != bestC) {
      callbackObject.set(mconn, bestC);
    }
    if (isNaN(bestR)) {
      // nothing found. this means we need to fetch backward
      foundAll = false;
    }
  }
  console.log('[B.cc] done. foundAll: ', foundAll);
  return foundAll;
}

TimeTableBoard.prototype.processNextFetchJob = function(reset) {
  var board = this;

  if (reset) {
    board.fromConnsFetched = false;
    board.toConnsFetched = false;
  }

  var field = $('[name=connFrom]');
  if (field.val() && !board.fromConnsFetched) {
    board.fromConnsFetched = true;
    board.getConnConnsBefore(field, $('[name=connFromGap]'));
    return;
  }

  var field = $('[name=connTo]');
  if (field.val() && !board.toConnsFetched) {
    board.toConnsFetched = true;
    board.getConnConnsAfter(field, $('[name=connToGap]'));
    return;
  }
}


/**
 * Returns y as a function of time
 */
TimeTableBoard.prototype.getY = function(t) {
  return Math.round((t - this.tOff) * this.tScale);
}

TimeTableBoard.prototype.drawGrid = function() {
  var y = this.getY(this.tMin);

  var sI = NaN, lI = NaN;

  var intervals = [10, 15, 30, 60];
  var interval;
  for (i in intervals ) {
    interval = intervals[i]*60000;
    var y2 = this.getY(this.tMin + interval);
    if (y2-y >= 25 && isNaN(lI) ) lI = interval;
    if (y2-y >= 15 && isNaN(sI) ) sI = interval;
  }

  var d = new Date(Math.floor(this.tMin/interval)*interval)

  if (this.gridSet) this.gridSet.remove();
  var set = this.R.set();

  // thin lines
  t = d.getTime();
  for ( ; t<this.tMax+sI; t+=sI ) {
    var y = this.getY(t);
    //R.line( 50, y, ww, y );
    //R.path('M35,'+y+'L'+ww+','+y+'').attr({'stroke-opacity': .5, 'stroke-width': .5});
  }

  // thick lines with labels
  t = d.getTime();
  for ( ; ; t+=lI ) {
    var y = this.getY(t);
    if (y > this.h) break;

    d = new Date(t);
    set.push(
      this.R.text( 5, y, d.format('HH:MM') ).attr(scale_txt),
      this.R.path('M35,'+y+'L'+this.w+','+y+'').attr(scale_line)
    );
  }

  this.gridSet = set;
}


/*******************************************************************************
 *** Connection object
 */

connection_svg_fontdef = 'Arial, Helvetica, sans-serif';
connection_major_colors = {
  sect_attr: {fill: '#cc6', 'fill-opacity': .6, 'stroke-opacity': 1, 'stroke-width': .5},
  sect_name1: {'font-size': '14px', 'font-family': connection_svg_fontdef, 'font-weight': 'bold', fill: '#CCCC66', 'text-anchor': 'middle'},
  sect_name2: {'font-size': '10px', 'font-family': connection_svg_fontdef, fill: '#CCCC66', 'text-anchor': 'middle'},
  platf_dep_box: {fill: '#cc0', 'fill-opacity': .5},
  platf_arr_box: {fill: '#ccc', 'fill-opacity': .5},
  platf_txt: {'font-size': '9px', 'font-family': connection_svg_fontdef, fill: '#000', 'text-anchor': 'start'},
  time_txt: {'font-size': '11px', 'font-family': connection_svg_fontdef, fill: "#222", 'text-anchor': 'end'},
  station_txt: {'font-size': '9px', 'font-family': connection_svg_fontdef, fill: "#222", 'text-anchor': 'end'},
};
connection_minor_colors = {
  sect_attr: {fill: '#eee', 'fill-opacity': .4, 'stroke-opacity': 1, 'stroke-width': .5},
  sect_name1: {'font-size': '14px', 'font-family': connection_svg_fontdef, 'font-weight': 'bold', fill: '#dddddd', 'text-anchor': 'middle'},
  sect_name2: {'font-size': '10px', 'font-family': connection_svg_fontdef, fill: '#dddddd', 'text-anchor': 'middle'},
  platf_dep_box: {fill: '#ee0', 'fill-opacity': .5},
  platf_arr_box: {fill: '#eee', 'fill-opacity': .5},
  platf_txt: {'font-size': '9px', 'font-family': connection_svg_fontdef, fill: '#444', 'text-anchor': 'start'},
  time_txt: {'font-size': '11px', 'font-family': connection_svg_fontdef, fill: "#666", 'text-anchor': 'end'},
  station_txt: {'font-size': '9px', 'font-family': connection_svg_fontdef, fill: "#666", 'text-anchor': 'end'},
};
scale_txt =  {'font-size': '9px', 'font-family': connection_svg_fontdef, fill: "#333", 'text-anchor': 'start'};
scale_line = {'stroke-opacity': .5, 'stroke-width': .25};

function Connection(jsonConnection) {
  this.conn = jsonConnection;

  var d = new Date();
  d.setISO8601( this.conn.from.departure );
  this.tMin = d.getTime();
  d.setISO8601( this.conn.to.arrival );
  this.tMax = d.getTime();
  this.tLen = this.tMax - this.tMin;

  this.set = undefined;
}

Connection.prototype.undraw = function() {
  if (this.set) {
    this.set.remove();
    this.set = undefined;
  }
}

Connection.prototype.draw = function(board, col, isMajor) {
  console.log( '[C.d] { ', 'col', col, 'conn', this );

  this.isMajor = isMajor;
  this.col = col;

  this.board = board;
  var R = board.R;

  this.undraw();
  var set = this.set = R.set();

  var x1 = board.offsetX0 +  parseInt(col)   *board.connWidth + board.connSpace;
  var x2 = board.offsetX0 + (parseInt(col)+1)*board.connWidth - board.connSpace;

  if (isMajor)
    this.colors = connection_major_colors;
  else
    this.colors = connection_minor_colors;

  sections = this.conn.sections
  for ( var sid in sections ) {
    section = sections[sid];

    this.drawSection(board, R, set, col, x1, x2, section);
  }

  console.log( '[C.d] } done.' );
}

Connection.prototype.drawSection = function(board, R, set, col, x1, x2, section) {
  if (!section.journey && section.walk)
    return; // we don't visualize walking

  var colors = this.colors;

  console.log('[c.d]', col, ': ', section, section.departure.station.name + '...' + section.arrival.station.name );

  var date1 = new Date();
  date1.setISO8601( section.departure.departure );
  var y1 = board.getY(date1.getTime());
  var date2 = new Date();
  date2.setISO8601( section.arrival.arrival );
  var y2 = board.getY(date2.getTime());
  var h = y2-y1;

  // bounding rect
  set.push(
    R.rect(x1, y1, x2-x1, y2-y1).attr(colors.sect_attr)
  );
  //.node.setAttribute('class', 'trsection');

  var jcat = section.journey.category;
  var jnum = section.journey.number;
  if (jcat == 'Nbu') jcat = section.journey.name; // NiederflurBUS
  if (jcat == 'Tro') jcat = section.journey.name; // Trolley
  var plf1 = section.departure.platform;
  if (!plf1) {
    plf1 = jcat;
    jcat = undefined;
  }
  var plf2 = section.arrival.platform;

  if (jcat)
    set.push(
      R.text( avg(x1,x2), avg(y1,y2, (Math.abs(y1-y2)>70?.4:.5)), jcat )
        .attr(colors.sect_name1)
    );
  //.node.setAttribute('class', 'trcat');
  if (Math.abs(y1-y2)>70)
    set.push(
      R.text( avg(x1,x2), avg(y1,y2,.4)+17, jnum )
        .attr(colors.sect_name2)
    );

  var my = avg(y1, y2);
  if (plf1)
    this.drawPlatform(set, x1, y1, my, plf1);
  if (plf2)
    this.drawPlatform(set, x1, y2, my, plf2);

  my = avg(y1, y2);
  this.drawTimePlace(set, x2, y1, my, section.departure.station.name, date1);
  this.drawTimePlace(set, x2, y2, my, section.arrival.station.name,   date2);
}

Connection.prototype.drawPlatform = function(set, x1, y, my, plf) {
  if (y > my && y-my < 15)
    return;

  var R = this.board.R;

  // we draw the rect first because of zorder
  var r = R.rect( x1+3, y+4, 2, 12 )
    .attr( (y<my?this.colors.platf_dep_box:this.colors.platf_arr_box ) );
  //r.node.setAttribute('class', 'trfrbox');
  var t = R.text( x1+7, (y<my?y+10:y-10), plf )
    .attr(this.colors.platf_txt);
  //t.node.setAttribute('class', 'trfrtxt');

  // use getBBox for rect dims: http://raphaeljs.com/reference.html#Element.getBBox
  var bb = t.getBBox();
  r.attr({x: bb.x-3, y: bb.y, width: bb.width+6, height: bb.height+1});

  set.push(r, t);
}

Connection.prototype.drawTimePlace = function(set, x2, y, my, station, date) {
  var t;

  if (y > my && y-my < 20)
    return;

  var R = this.board.R;

  t = R.text( x2-3, (y<my?y+7:y-7), date.format('H:MM') )
    .attr(this.colors.time_txt);
  //t.node.setAttribute('class', 'trfrtm');
  set.push(t);

  if (Math.abs(y-my) < 20)
    return;

  t = R.text( x2-3, (y<my?y+20:y-20), station )
    .attr(this.colors.station_txt);
  //t.node.setAttribute('class', 'trftst');
  set.push(t);
}

Connection.prototype.equals = function(b) {
  var a = this;
  if (a.tMin != b.tMin) return false;
  if (a.tMax != b.tMax) return false;
  if (a.conn.sections.length != b.conn.sections.length) return false;
  // TODO compare contents of sections

  return true;
}

/**
 * overtake graphics-relevant information from another connection
 */
Connection.prototype.mergeFrom = function(b) {
  this.set = b.set;
  this.col = b.col;
}


/******************************************************************************/

