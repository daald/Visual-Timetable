


//////////////////////////////////////// MINI LIB
function avg(v1, v2, w=.5) {
  return (v2 - v1) * w + v1;
}

//////////////////////////////////////// START FUNCTION
$(function(){
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
function TimeTableBoard() {
  this.h = 480;
  this.w = 640;
  $('#timetable').empty();
  this.R = Raphael('timetable', this.w, this.h);

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

  var ajaxData = 'from='+this.from+'&to='+this.to+'&date=2012-12-10&time='+this.time+'&limit=5'
  var tthis = this;
  $.ajax({
    type: 'GET',
    url: 'http://transport.opendata.ch/v1/connections', data: ajaxData
  }).done( function(msg) {
    json = JSON.parse(msg);
    console.log(json);

    tthis.drawMainConnections(json)
  }).fail( function( xmlHttpRequest, statusText, errorThrown ) {
    alert(
      "Your form submission failed.\n\n"
        + "XML Http Request: " + JSON.stringify( xmlHttpRequest )
        + ",\nStatus Text: " + statusText
        + ",\nError Thrown: " + errorThrown );
  });
}

TimeTableBoard.prototype.drawMainConnections = function(json) {
  conns = new Array();

  connections = json.connections;
  console.log('connections', connections);

  // Get dimensions
  this.tMin = NaN;
  this.tMax = NaN;
  for ( var cid in connections ) {
    connection = connections[cid];
    console.log( cid + ': ', connection );

    conn = new Connection(this, connection)
    conns.push(conn);

    if (isNaN(this.tMin) || this.tMin > conn.from) this.tMin = conn.from;
    if (isNaN(this.tMax) || this.tMax < conn.to)   this.tMax = conn.to;
  }
  console.log('tMin', this.tMin);
  console.log('tMax', this.tMax);

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


  for ( var cid in conns ) {
    conn = conns[cid];
    conn.draw(cid);
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
  this.from = d.getTime();
  d.setISO8601( this.conn.to.arrival );
  this.to = d.getTime();
}

Connection.prototype.R = function(col) {
  return this.board.R;
}

Connection.prototype.draw = function(col) {
  console.log( 'conn: ', this.conn );

  this.col = col;

  var R = this.R();
  var board = this.board;

  var x1 = board.ox1 +  parseInt(col)   *100 + 5;
  var x2 = board.ox1 + (parseInt(col)+1)*100 - 5;

  sections = this.conn.sections
  for ( var sid in sections ) {
    section = sections[sid];

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

    R.text( avg(x1,x2), avg(y1,y2, (Math.abs(y1-y2)>40?.4:.5)), section.journey.category )
      .attr({font: '14px "Arial"', 'font-weight': 'bold', fill: '#CCCC66', 'text-anchor': 'middle'});
    //.node.setAttribute('class', 'trcat');
    if (Math.abs(y1-y2)>50)
      R.text( avg(x1,x2), avg(y1,y2,.4)+17, section.journey.number )
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

    console.log( '    ' + sid + ': ', section, section.departure, section.arrival );
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

