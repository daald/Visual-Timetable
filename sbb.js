

//////////////////////////////////////// MINI LIB
function avg(v1, v2, w) {
  if (!w) w = .5;
  return (v2 - v1) * w + v1;
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
            /*open: function() {
                $( this ).removeClass( "ui-corner-all" ).addClass( "ui-corner-top" );
            },
            close: function() {
                $( this ).removeClass( "ui-corner-top" ).addClass( "ui-corner-all" );
            }*/
        });

  // other configurations

  var board = new TimeTableBoard();
  //$('#userInput').submit(function() {
  $('input[type=submit]').click(function(event) {
    event.preventDefault();

    board.init();
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

    board.init();
  });

  $('#save').click(function(event) {
    event.preventDefault();

    var content = $('#timetable').html();
    var uriContent = "data:image/svg+xml," + encodeURIComponent(content);
    //var uriContent = "data:application/octet-stream," + encodeURIComponent(content);
    var newWindow = window.open(uriContent, 'timetable.svg');
  });

  $('#ctlEnlarge').click(function(event) {
    event.preventDefault();
    board.connNum++;
    board.setDims();
    board.drawGrid();
  });

  $('#ctlShrink').click(function(event) {
    if (board.connNum <= 1) return;
    event.preventDefault();
    board.connNum--;
    board.setDims();
  });

  // initial display
  board.init();
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
 *** TimeTableBoard object
 */
function ConnectionLoader() {
}

ConnectionLoader.prototype.init = function(from, to, time, callbackObject) {
  this.from = from;
  this.to = to;
  this.conns = [];
  this.callbackObject = callbackObject;
  this.tStartMin = NaN;
  this.tStartMax = NaN;
  this.tEndMin = NaN;
  this.tEndMax = NaN;

  this.load(time);
}

ConnectionLoader.prototype.load = function(time) {
  var tStr = time.format('HH:MM')
  var dStr = time.format('yyyy-mm-dd')

  var queryStr = 'from='+this.from+'&to='+this.to+'&date='+dStr+'&time='+tStr+'&limit=6';
  var loader = this;
  $.ajax({
    type: 'GET',
    url: 'http://transport.opendata.ch/v1/connections',
    dataType: 'json',
    data: queryStr
  }).done( function(json) {
    loader.handleData(json);

    //FIXME: callback only a subset of conns
    loader.callbackObject.callback(loader.conns);
  }).fail( function( xmlHttpRequest, statusText, errorThrown ) {
    alert(
      "Your form submission failed.\n\n"
        + "XML Http Request: " + JSON.stringify( xmlHttpRequest )
        + ",\nStatus Text: " + statusText
        + ",\nError Thrown: " + errorThrown );
  });
}

ConnectionLoader.prototype.handleData = function(json) {
  console.log('[L.hd]', json);
  this.from = json.from.name;
  this.to   = json.to.name;
  if (this.callbackObject.names) {
    this.callbackObject.names(this.from, this.to);
    this.callbackObject.names = undefined;
  }

  // create objects, adjust min/max
  var connections = json.connections;
  for ( var cid in connections ) {
    connection = json.connections[cid];
    console.log('[L.hd]', cid + ': ', connection );

    conn = new Connection(connection)
    this.conns.push(conn);

    if (isNaN(this.tStartMin) || this.tStartMin > conn.tMin) this.tStartMin = conn.tMin;
    if (isNaN(this.tStartMax) || this.tStartMax < conn.tMin) this.tStartMax = conn.tMin;
    if (isNaN(this.tEndMin)   || this.tEndMin   > conn.tMax) this.tEndMin   = conn.tMax;
    if (isNaN(this.tEndMax)   || this.tEndMax   < conn.tMax) this.tEndMax   = conn.tMax;
  }
  console.log('[L.hd] count',   this.conns.length);
  console.log('[L.hd] tStart*', this.tStartMin, '..', this.tStartMax);
  console.log('[L.hd] tEnd*',   this.tEndMin,   '..', this.tEndMax);
}


/*******************************************************************************
 *** TimeTableBoard object
 */
function TimeTableBoard() {

  this.ox0 = 40; // X of first connection
  this.connWidth = 100;
  this.connSpace = 10;
  this.connNum = 7;

  this.setDims();
  $('#timetable').empty();
  this.R = Raphael('timetable', this.w, this.h);

  this.connsBefore = [];
  this.connsAfter  = [];

  //var tMin, tMax;
  //var tOff, tScale;
  //var ox0;

  this.gridSet = undefined;
}

TimeTableBoard.prototype.init = function() {
  $('#timetable').empty();
  this.R = Raphael('timetable', this.w, this.h);

  this.from = $('[name=from]').val();
  this.to   = $('[name=to]'  ).val();
  this.time = this.parseUIDateTime( $('[name=date]'), $('[name=time]') );

  var board = this;

  this.mainLoader = new ConnectionLoader();
  this.mainLoader.init(this.from, this.to, this.time, {
    callback: function(conns) {
      console.log('[B.hmc]');

      // Get dimensions
      board.tMin = board.mainLoader.tStartMin;
      board.tMax = board.mainLoader.tEndMax;
      var maxMin = board.mainLoader.tStartMax;
      var minMax = board.mainLoader.tEndMin;
      board.conns = conns;
      console.log('[B.hmc] tMin', board.tMin);
      console.log('[B.hmc] tMax', board.tMax);

      board.getConnConnsBefore(board.mainLoader.tStartMin, board.mainLoader.tStartMax);
      board.getConnConnsAfter(board.mainLoader.tEndMin, board.mainLoader.tEndMax);

      var d = new Date(board.tMin)
      d.setMinutes(Math.floor(d.getMinutes()/30)*30)
      d.setSeconds(0)
      d.setMilliseconds(0)
      board.tMin = d.getTime();
      console.log('[B.hmc] tMin2', board.tMin);

      board.tOff = board.tMin;
      board.tScale = board.h / (board.tMax-board.tMin);

      board.drawGrid()

      for ( var cid in board.conns ) {
        var conn = board.conns[cid];
        conn.draw(board, cid);
      }
    },
    names: function(from, to) {
      board.from = from;
      $('[name=from]').val(from);
      board.to = to;
      $('[name=to]'  ).val(to);
    }
  });
}

TimeTableBoard.prototype.setDims = function(dRef, tRef) {
  this.h = 480;
  this.w = this.ox0 + this.connWidth * this.connNum;

  if (this.R) this.R.setSize(this.w, this.h);
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

TimeTableBoard.prototype.getConnConnsBefore = function(tMin, tMax) {
  this.connFrom = $('[name=connFrom]').val();
  if (!this.connFrom) return;

  var date1 = new Date(tMin-0);//FIXME

  var board = this;

  var minSpace = 3*60000; // [ms]

  this.beforeLoader = new ConnectionLoader();
  this.beforeLoader.init(this.connFrom, this.from, date1, {
    callback: function(conns) {
      console.log('[B.-1.c] connections', conns);

      board.connectConnections(board.mainLoader, board.beforeLoader, {
        rate: function(mconn, bconn) {
          if (mconn.tMin - minSpace < bconn.tMax)
            return -1; // not useable

          return mconn.tMin - minSpace - bconn.tMax; // [ms] of waiting time
        },
        cmp: function(conn1, conn2) {
          return (conn1.tLength - conn2.tLength);
        },
        set: function(mconn, bconn) {
          mconn.cBefore = bconn;
          bconn.draw(board, mconn.col);
        },
        get: function(mconn) {
          return mconn.cBefore;
        },
      });
    },
    names: function(from, to) {
      $('[name=connFrom]').val(from);
    }
  });
}

TimeTableBoard.prototype.getConnConnsAfter = function(tMin, tMax) {
  this.connTo = $('[name=connTo]'  ).val();
  if (!this.connTo) return;

  var date1 = new Date(tMin-0);//FIXME

  var board = this;

  var minSpace = 3*60000; // [ms]

  this.afterLoader = new ConnectionLoader();
  this.afterLoader.init(this.to, this.connTo, date1, {
    callback: function(conns) {
      console.log('[B.+1.c] conns', conns);

      board.connectConnections(board.mainLoader, board.afterLoader, {
        rate: function(mconn, bconn) {
          if (mconn.tMax + minSpace > bconn.tMin)
            return -1; // not useable

          return bconn.tMax - (mconn.tMax + minSpace); // [ms] of waiting time
        },
        cmp: function(conn1, conn2) {
          return (conn1.tLength - conn2.tLength);
        },
        set: function(mconn, bconn) {
          mconn.cAfter = bconn;
          bconn.draw(board, mconn.col);
        },
        get: function(mconn) {
          return mconn.cAfter;
        },
      });
    },
    names: function(from, to) {
      $('[name=connTo]').val(to);
    }
  });
}

TimeTableBoard.prototype.connectConnections = function(mainLoader, connLoader, callbackObject) {
  console.log('[B.cc]');

  /** callbackObject contains:
   * rate  function(mconn, bconn) -> gap [ms]
   * cmp   function(conn1, conn2) -> (<0)=(<) 0=(==) (>0)=(>)
   * set   function(mconn, bconn)
   * get   function(mconn) -> bconn
   */

  var mconns = mainLoader.conns;
  var cconns = connLoader.conns;
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

      console.log('[B.cc]', 'bestC', bestC, 'bestR', bestR, 'mconn', mconn, 'cconn', cconn, 'r', r);

      if (isNaN(bestR) || r < bestR || (r == bestR && callbackObject.cmp(cconn, bestC)<0 )) {
        bestR = r;
        bestC = cconn;
        console.log('[B.cc] -', 'bestC', bestC, 'bestR', bestR);
      }
    }
    console.log('[B.cc] =', 'bestC', bestC, 'bestR', bestR);
    if (callbackObject.get(mconn) != bestC) {
      callbackObject.set(mconn, bestC);
    }
  }
  console.log('[B.cc] done.');
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

  var d = new Date(this.tMin)

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
  for ( ; t<this.tMax+lI; t+=lI ) {
    var y = this.getY(t);
    d = new Date(t);
    set.push(
      this.R.text( 5, y, d.format('HH:MM') ).attr({"font": '9px "Arial"', fill: "#333", 'text-anchor': 'start'}),
      this.R.path('M35,'+y+'L'+this.w+','+y+'').attr({'stroke-opacity': .5, 'stroke-width': .25})
    );
  }

  this.gridSet = set;
}


/*******************************************************************************
 *** Connection object
 */

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

Connection.prototype.findConnConn = function(isBefore, conns) {
  console.log('[c.fcc] ', this, isBefore);

  var space = 0 * 60000;//FIXME

  var tMax = NaN, tMin = NaN;
  for ( var cid in conns ) {
    var conn = conns[cid];
    if (isBefore) {
      if ((isNaN(tMax) || conn.tMax > tMax) && conn.tMax <= this.tMin - space) {
        this.cBefore = conn;
        tMax = conn.tMax;
      }
    } else {
      if ((isNaN(tMin) || conn.tMin < tMin) && conn.tMin >= this.tMax + space) {
        this.cAfter = conn;
        tMin = conn.tMin;
      }
    }
  }

  if (isBefore)
    console.log('[c.fcc] new before', this, this.cBefore);
  else
    console.log('[c.fcc] new after', this, this.cAfter);

  // FIXME: only a test
  if (isBefore) {
    if (this.cBefore) this.cBefore.draw(board, this.col);
  } else {
    if (this.cAfter) this.cAfter.draw(board, this.col);
  }
}

Connection.prototype.draw = function(board, col) {
  console.log( '[C.d] { ', 'col', col, 'conn', this );

  this.col = col;

  this.board = board;
  var R = board.R;

  if (this.set) this.set.remove();
  var set = this.set = R.set();

  var x1 = board.ox0 +  parseInt(col)   *board.connWidth + board.connSpace;
  var x2 = board.ox0 + (parseInt(col)+1)*board.connWidth - board.connSpace;

  sections = this.conn.sections
  for ( var sid in sections ) {
    section = sections[sid];

    if (!section.journey && section.walk)
      continue; // we don't visualize walking

    console.log('[c.d]', sid + ': ', section, section.departure.station.name + '...' + section.arrival.station.name );

    var date1 = new Date();
    date1.setISO8601( section.departure.departure );
    var y1 = board.getY(date1.getTime());
    var date2 = new Date();
    date2.setISO8601( section.arrival.arrival );
    var y2 = board.getY(date2.getTime());
    var h = y2-y1;

    // bounding rect
    set.push(
      R.rect(x1, y1, x2-x1, y2-y1)
        .attr({fill: '#cc6', 'fill-opacity': .4, 'stroke-opacity': 1, 'stroke-width': .5})
    );
    //.node.setAttribute('class', 'trsection');

    var jcat = section.journey.category;
    var jnum = section.journey.number;
    if (jcat == 'Nbu') jcat = section.journey.name;
    set.push(
      R.text( avg(x1,x2), avg(y1,y2, (Math.abs(y1-y2)>40?.4:.5)), jcat )
        .attr({font: '14px "Arial"', 'font-weight': 'bold', fill: '#CCCC66', 'text-anchor': 'middle'})
    );
    //.node.setAttribute('class', 'trcat');
    if (Math.abs(y1-y2)>50)
      set.push(
        R.text( avg(x1,x2), avg(y1,y2,.4)+17, jnum )
          .attr({font: '10px "Arial"', fill: '#CCCC66', 'text-anchor': 'middle'})
      );

    var my = avg(y1, y2);
    var plf1 = section.departure.platform;
    if (plf1)
      this.drawPlatform(set, x1, y1, my, plf1);
    var plf2 = section.arrival.platform;
    if (plf2)
      this.drawPlatform(set, x1, y2, my, plf2);

    my = avg(y1, y2);
    this.drawTimePlace(set, x2, y1, my, section.departure.station.name, date1);
    this.drawTimePlace(set, x2, y2, my, section.arrival.station.name,   date2);
  }

  console.log( '[C.d] } done.' );
}

Connection.prototype.drawPlatform = function(set, x1, y, my, plf) {
  if (y > my && y-my < 15)
    return;

  var R = this.board.R;

  // we draw the rect first because of zorder
  var r = R.rect( x1+3, y+4, 2, 12 )
    .attr({fill: (y<my?'#cc0':'#ccc'), 'fill-opacity': .5});
  //r.node.setAttribute('class', 'trfrbox');
  var t = R.text( x1+7, (y<my?y+10:y-10), plf )
    .attr({'font': '9px "Arial"', fill: '#000', 'text-anchor': 'start'});
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
    .attr({"font": '11px "Arial"', fill: "#222", 'text-anchor': 'end'});
  //t.node.setAttribute('class', 'trfrtm');
  set.push(t);

  if (Math.abs(y-my) < 20)
    return;

  t = R.text( x2-3, (y<my?y+20:y-20), station )
    .attr({"font": '9px "Arial"', fill: "#222", 'text-anchor': 'end'});
  //t.node.setAttribute('class', 'trftst');
  set.push(t);
}

/******************************************************************************/

