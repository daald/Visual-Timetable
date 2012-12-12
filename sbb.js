


//////////////////////////////////////// MINI LIB
function avg(v1, v2, w=.5) {
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
  $('input[type=button]').click(function(event) {
    var from = $('[name=from]');
    var to   = $('[name=to]'  );
    var tmp = from.val();
    from.val(to.val());
    to.val(tmp);

    board.init();
  });

  // initial display
  board.init();
});


/*******************************************************************************
 *** TimeTableBoard object
 */
function ConnectionLoader(from, to, time, callback) {
  this.from = from;
  this.to = to;

  this.load(time, callback);
}

ConnectionLoader.prototype.load = function(time, callback) {
  var queryStr = 'from='+this.from+'&to='+this.to+'&date=2012-12-10&time='+time+'&limit=6';
  var tthis = this;
  $.ajax({
    type: 'GET',
    url: 'http://transport.opendata.ch/v1/connections',
    dataType: 'json',
    data: queryStr
  }).done( function(json) {
    console.log(json);

    tthis.handleMainConns(json)
  }).fail( function( xmlHttpRequest, statusText, errorThrown ) {
    alert(
      "Your form submission failed.\n\n"
        + "XML Http Request: " + JSON.stringify( xmlHttpRequest )
        + ",\nStatus Text: " + statusText
        + ",\nError Thrown: " + errorThrown );
  });
}

ConnectionLoader.prototype.init = function() {
}


/*******************************************************************************
 *** TimeTableBoard object
 */
function TimeTableBoard() {
  this.h = 480;
  this.w = 640;
  $('#timetable').empty();
  this.R = Raphael('timetable', this.w, this.h);

  this.connsBefore = [];
  this.connsAfter  = [];

  //var tMin, tMax;
  //var tOff, tScale;
  //var ox1;
}

TimeTableBoard.prototype.init = function() {
  $('#timetable').empty();
  this.R = Raphael('timetable', this.w, this.h);

  this.from = $('[name=from]').val();
  this.to   = $('[name=to]'  ).val();
  this.date = $('[name=date]').val();
  this.time = $('[name=time]').val();

  var ajaxData = 'from='+this.from+'&to='+this.to+'&date=2012-12-10&time='+this.time+'&limit=6'
  var tthis = this;
  $.ajax({
    type: 'GET',
    url: 'http://transport.opendata.ch/v1/connections',
    dataType: 'json',
    data: ajaxData
  }).done( function(json) {
    console.log(json);

    tthis.handleMainConns(json)
  }).fail( function( xmlHttpRequest, statusText, errorThrown ) {
    alert(
      "Your form submission failed.\n\n"
        + "XML Http Request: " + JSON.stringify( xmlHttpRequest )
        + ",\nStatus Text: " + statusText
        + ",\nError Thrown: " + errorThrown );
  });
}

TimeTableBoard.prototype.handleMainConns = function(json) {
  this.conns = new Array();

  connections = json.connections;
  console.log('connections', connections);

  // Get dimensions
  this.tMin = NaN;
  this.tMax = NaN;
  var maxMin = NaN;
  var minMax = NaN;
  for ( var cid in connections ) {
    connection = connections[cid];
    console.log( cid + ': ', connection );

    conn = new Connection(this, connection)
    this.conns.push(conn);

    if (isNaN(this.tMin) || this.tMin > conn.tMin) this.tMin = conn.tMin;
    if (isNaN(this.tMax) || this.tMax < conn.tMax)   this.tMax = conn.tMax;
    if (isNaN(maxMin) || maxMin < conn.tMin) maxMin = conn.tMin;
    if (isNaN(minMax) || minMax > conn.tMax)   minMax = conn.tMax;
  }
  console.log('tMin', this.tMin);
  console.log('tMax', this.tMax);

  this.getConnConns(true,  this.tMin, maxMin);
  this.getConnConns(false, minMax, this.tMax);

  var d = new Date(this.tMin)
  d.setMinutes(Math.floor(d.getMinutes()/30)*30)
  d.setSeconds(0)
  d.setMilliseconds(0)
  this.tMin = d.getTime();
  console.log('tMin2', this.tMin);

  this.ox1 = 40;

  this.tOff = this.tMin;
  this.tScale = this.h / (this.tMax-this.tMin);

  this.drawGrid()

  for ( var cid in this.conns ) {
    var conn = this.conns[cid];
    conn.draw(cid);
  }
}

TimeTableBoard.prototype.getConnConns = function(isBefore, tMin, tMax) {
  this.connFrom = $('[name=connFrom]').val();
  this.connTo   = $('[name=connTo]'  ).val();

  var date1 = new Date(tMin-0);//FIXME
  var tMinStr = date1.format('HH:MM')
  var dMinStr = date1.format('yyyy-mm-dd')

  if (isBefore) {
    if (!this.connFrom) return;
    var ajaxData = 'from='+this.connFrom+'&to='+this.from+'&date='+dMinStr+'&time='+tMinStr+'&limit=5'
  } else {
    if (!this.connTo) return;
    var ajaxData = 'from='+this.to+'&to='+this.connTo+'&date='+dMinStr+'&time='+tMinStr+'&limit=5'
  }

  console.log('[ajax]', ajaxData);

  var tthis = this;
  $.ajax({
    type: 'GET',
    url: 'http://transport.opendata.ch/v1/connections',
    data: ajaxData,
    dataType: 'json',
  }).done( function(json) {
    console.log(json);

    tthis.handleConnConns(isBefore, tMax, json)
  }).fail( function( xmlHttpRequest, statusText, errorThrown ) {
    alert(
      "Your form submission failed.\n\n"
        + "XML Http Request: " + JSON.stringify( xmlHttpRequest )
        + ",\nStatus Text: " + statusText
        + ",\nError Thrown: " + errorThrown );
  });
}

TimeTableBoard.prototype.handleConnConns = function(isBefore, tMax, json) {
  var conns = isBefore?this.connsBefore:this.connsAfter; // conns is a hash

  connections = json.connections;
  console.log('[b.hcc] before', isBefore);
  console.log('[b.hcc] connections', connections);

  // Get dimensions
  var tMin = NaN;
  var tMax = NaN;
  for ( var cid in connections ) {
    connection = connections[cid];
    console.log('[b.hcc]', cid + ': ', connection );

    conn = new Connection(this, connection)
    var t = isBefore?conn.tMax:conn.tMin;
    conn.t = t;

    if (isNaN(tMin) || tMin > t) tMin = t;
    if (isNaN(tMax) || tMax < t) tMax = t;

    //if (conns[t] && conns[t].tMax-conns[t].tMin < conn.tMax-conn.tMin)
    //  continue // keep faster connections
    //else
    conns.push(conn);
  }
  console.log('[b.hcc] tMin', tMin);
  console.log('[b.hcc] tMax', tMax);
  console.log('[b.hcc] conns', conns);

  if (isBefore)
    this.connsBefore = conns;
  else
    this.connsAfter = conns;

  for ( var cid in this.conns ) {
    var conn = this.conns[cid];
    conn.findConnConn(isBefore, conns);
  }
}

TimeTableBoard.prototype.drawGrid = function() {
  var y = Math.round((this.tMin - this.tOff) * this.tScale);

  var sI = NaN, lI = NaN;

  var intervals = [10, 15, 30, 60];
  var interval;
  for (i in intervals ) {
    interval = intervals[i]*60000;
    var y2 = Math.round((this.tMin + interval - this.tOff) * this.tScale);
    if (y2-y >= 25 && isNaN(lI) ) lI = interval;
    if (y2-y >= 15 && isNaN(sI) ) sI = interval;
  }

  var d = new Date(this.tMin)

  // thin lines
  t = d.getTime();
  for ( ; t<this.tMax+sI; t+=sI ) {
    var y = Math.round((t - this.tOff) * this.tScale);
    //R.line( 50, y, ww, y );
    //R.path('M35,'+y+'L'+ww+','+y+'').attr({'stroke-opacity': .5, 'stroke-width': .5});
  }

  // thick lines with labels
  t = d.getTime();
  for ( ; t<this.tMax+lI; t+=lI ) {
    var y = Math.round((t - this.tOff) * this.tScale);
    d = new Date(t);
    this.R.text( 5, y, d.format('HH:MM') ).attr({"font": '9px "Arial"', fill: "#333", 'text-anchor': 'start'});
    this.R.path('M35,'+y+'L'+this.w+','+y+'').attr({'stroke-opacity': .5, 'stroke-width': .25});
  }
}


/*******************************************************************************
 *** Connection object
 */

function Connection(board, jsonConnection) {
  this.board = board;
  this.conn  = jsonConnection;

  var d = new Date();
  d.setISO8601( this.conn.from.departure );
  this.tMin = d.getTime();
  d.setISO8601( this.conn.to.arrival );
  this.tMax = d.getTime();
}

Connection.prototype.R = function(col) {
  return this.board.R;
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
    if (this.cBefore) this.cBefore.draw(this.col);
  } else {
    if (this.cAfter) this.cAfter.draw(this.col);
  }
}

Connection.prototype.draw = function(col) {
  console.log( '[c.d] conn: ', this );

  this.col = col;

  var R = this.R();
  var board = this.board;

  var x1 = board.ox1 +  parseInt(col)   *100 + 5;
  var x2 = board.ox1 + (parseInt(col)+1)*100 - 5;

  sections = this.conn.sections
  for ( var sid in sections ) {
    section = sections[sid];

    if (!section.journey && section.walk)
      continue; // we don't visualize walking

    console.log('[c.d]', sid + ': ', section, section.departure.station.name + '...' + section.arrival.station.name );

    var date1 = new Date();
    date1.setISO8601( section.departure.departure );
    var y1 = Math.round((date1.getTime() - board.tOff) * board.tScale);
    var date2 = new Date();
    date2.setISO8601( section.arrival.arrival );
    var y2 = Math.round((date2.getTime() - board.tOff) * board.tScale);
    var h = y2-y1;

    // bounding rect
    R.rect(x1+5, y1, x2-x1-10, y2-y1)
      .attr({fill: '#cc6', 'fill-opacity': .4, 'stroke-opacity': 1, 'stroke-width': .5});
    //.node.setAttribute('class', 'trsection');


    var jcat = section.journey.category;
    var jnum = section.journey.number;
    if (jcat == 'Nbu') jcat = section.journey.name;
    R.text( avg(x1,x2), avg(y1,y2, (Math.abs(y1-y2)>40?.4:.5)), jcat )
      .attr({font: '14px "Arial"', 'font-weight': 'bold', fill: '#CCCC66', 'text-anchor': 'middle'});
    //.node.setAttribute('class', 'trcat');
    if (Math.abs(y1-y2)>50)
      R.text( avg(x1,x2), avg(y1,y2,.4)+17, jnum )
        .attr({font: '10px "Arial"', fill: '#CCCC66', 'text-anchor': 'middle'});

    var my = avg(y1, y2);
    var plf1 = section.departure.platform;
    if (plf1)
      this.drawPlatform(x1, y1, my, plf1);
    var plf2 = section.arrival.platform;
    if (plf2)
      this.drawPlatform(x1, y2, my, plf2);

    my = avg(y1, y2);
    this.drawTimePlace(x2, y1, my, section.departure.station.name, date1);
    this.drawTimePlace(x2, y2, my, section.arrival.station.name,   date2);
  }
}

Connection.prototype.drawPlatform = function(x1, y, my, plf) {
  if (y > my && y-my < 15)
    return;

  var R = this.R();

  // we draw the rect first because of zorder
  var r = R.rect( x1+8, y+4, 12, 12 )
    .attr({fill: (y<my?'#cc0':'#ccc'), 'fill-opacity': .5});
  //r.node.setAttribute('class', 'trfrbox');
  var t = R.text( x1+12, (y<my?y+10:y-10), plf )
    .attr({'font': '9px "Arial"', fill: '#000', 'text-anchor': 'start'});
  //t.node.setAttribute('class', 'trfrtxt');

  // use getBBox for rect dims: http://raphaeljs.com/reference.html#Element.getBBox
  var bb = t.getBBox();
  r.attr({x: bb.x-3, y: bb.y, width: bb.width+6, height: bb.height+1});
}

Connection.prototype.drawTimePlace = function(x2, y, my, station, date) {
  var t;

  if (y > my && y-my < 20)
    return;

  var R = this.R();

  t = R.text( x2-8, (y<my?y+7:y-7), date.format('H:MM') )
    .attr({"font": '11px "Arial"', fill: "#222", 'text-anchor': 'end'});
  //t.node.setAttribute('class', 'trfrtm');

  if (Math.abs(y-my) < 20)
    return;

  t = R.text( x2-8, (y<my?y+20:y-20), station )
    .attr({"font": '9px "Arial"', fill: "#222", 'text-anchor': 'end'});
  //t.node.setAttribute('class', 'trftst');
}

/******************************************************************************/

