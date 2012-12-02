


function avg(v1, v2) {
  return (v2 - v1) / 2 + v1;
}

$(function(){
  //$('#userInput').submit(function() {
  $('input[type=submit]').click(function(event) {
    event.preventDefault();

    updateGraphics();
  });


/*$('#userInput').bind('submit', function () {
  var elements = this.elements;
alert(elements);
});*/

  // initial display
  updateGraphics();

});


function updateGraphics() {
  var hh = 480;
  var ww = 640;

  $('#timetable').empty();
  var R = Raphael('timetable', ww, hh);


    var from = $('[name=from]').val();
    var to   = $('[name=to]').val();
    var date = $('[name=date]').val();
    var time = $('[name=time]').val();



$.ajax({
  type: 'GET',
  //url: 'http://transport.opendata.ch/v1/stationboard',  data: 'station=Aarau&limit=10'
  //url: 'http://transport.opendata.ch/v1/connections', data: 'from=Z%C3%BCrich+Hardbr%C3%BCcke&to=Schaffhausen&date=2012-12-10&time=19:00:00&limit=5'
  url: 'http://transport.opendata.ch/v1/connections', data: 'from='+from+'&to='+to+'&date=2012-12-10&time='+time+'&limit=5'
}).done( function(msg){
  json = JSON.parse(msg);
  console.log(json);

  connections = json.connections;
  console.log('connections', connections);

  // Get dimensions
  var tMin = NaN;
  var tMax = NaN;
  for ( var cid in connections ) {
    connection = connections[cid];
    console.log( cid + ': ', connection );
    var d = new Date();
    d.setISO8601( connection.from.departure );
    if (isNaN(tMin) || tMin > d.getTime()) tMin = d.getTime();
    d.setISO8601( connection.to.arrival );
    if (isNaN(tMax) || tMax < d.getTime()) tMax = d.getTime();
  }
  console.log('tMin', tMin);
  console.log('tMax', tMax);

  var ox1 = 100;

  var tOff = tMin;
  var tScale = hh / (tMax-tMin);

  for ( var cid in connections ) {
    connection = connections[cid];
    console.log( cid + ': ', connection );

    x1 = ox1 +  parseInt(cid)   *100 + 5;
    x2 = ox1 + (parseInt(cid)+1)*100 - 5;

    //R.rect(x1, 0, x2-x1, hh);

    sections = connection.sections
    for ( var sid in sections ) {
      section = sections[sid];

      var date1 = new Date();
      date1.setISO8601( section.departure.departure );
      var y1 = Math.round((date1.getTime() - tOff) * tScale);
      var date2 = new Date();
      date2.setISO8601( section.arrival.arrival );
      var y2 = Math.round((date2.getTime() - tOff) * tScale);
      var h = y2-y1;

      R.rect(x1+5, y1, x2-x1-10, y2-y1).attr({fill: '#ccc', 'fill-opacity': .5});

      plf1 = section.departure.platform;
      if (plf1) {
        // use getBBox for rect dims: http://raphaeljs.com/reference.html#Element.getBBox
        R.rect( x1+8, y1+4, 12, 12 ).attr({fill: '#cc0', 'fill-opacity': .5});
        R.text( x1+10, y1+10, plf1 ).attr({'font': '9px "Arial"', fill: '#333', 'text-anchor': 'start'});
      }

      plf2 = section.arrival.platform;
      if (plf2 && h>30) {
        // use getBBox for rect dims: http://raphaeljs.com/reference.html#Element.getBBox
        R.rect( x1+8, y2-4-12, 12, 12 ).attr({fill: '#ccc', 'fill-opacity': .5});
        R.text( x1+10, y2-10, plf2 ).attr({'font': '9px "Arial"', fill: "#333", 'text-anchor': 'start'});
      }

      if (h > 30) {
        stn1 = section.departure.station.name;
        R.text( x2-8, y1+20, stn1 ).attr({"font": '9px "Arial"', fill: "#333", 'text-anchor': 'end'});
        stn2 = section.arrival.station.name;
        R.text( x2-8, y2-20, stn2 ).attr({"font": '9px "Arial"', fill: "#333", 'text-anchor': 'end'});
      }

      R.text( x2-8, y1+6, date1.format('HH:MM') ).attr({"font": '9px "Arial"', fill: "#333", 'text-anchor': 'end'});
      R.text( x2-8, y2-6, date2.format('HH:MM') ).attr({"font": '9px "Arial"', fill: "#333", 'text-anchor': 'end'});

      train = section.journey.category;
      R.text( avg(x1,x2), avg(y1,y2), train ).attr({"font": '9px "Arial"', fill: "#333", 'text-anchor': 'middle'});

      console.log( '    ' + sid + ': ', section, section.departure, section.arrival );
    }
  }

  d = new Date(tMin)
  d.setMinutes(Math.floor(d.getMinutes()/30)*30)
  d.setSeconds(0)
  d.setMilliseconds(0)
  t = d.getTime();

  var y = Math.round((t - tOff) * tScale);

  var sI = NaN, lI = NaN;

  var intervals = [5, 10, 15, 30, 60];
  var interval;
  for (i in intervals ) {
    interval = intervals[i]*60000;
    var y2 = Math.round((t + interval - tOff) * tScale);
    if (y2-y >= 25 && isNaN(lI) ) lI = interval;
    if (y2-y >= 15 && isNaN(sI) ) sI = interval;
  }

  t = d.getTime();
  for ( ; t<tMax+sI; t+=sI ) {
    var y = Math.round((t - tOff) * tScale);
    //R.line( 50, y, ww, y );
    //R.path('M50,'+y+'L'+ww+','+y+'').attr({'stroke-opacity': .5, 'stroke-width': .5});
  }

  t = d.getTime();
  for ( ; t<tMax+lI; t+=lI ) {
    var y = Math.round((t - tOff) * tScale);
    d = new Date(t);
    R.text( 5, y, d.format('HH:MM') ).attr({"font": '9px "Arial"', fill: "#333", 'text-anchor': 'start'});
    R.path('M50,'+y+'L'+ww+','+y+'').attr({'stroke-opacity': .5, 'stroke-width': .25});
  }


  //alert( "Data Saved: " + json );

}).fail( function( xmlHttpRequest, statusText, errorThrown ) {
  alert(
    "Your form submission failed.\n\n"
      + "XML Http Request: " + JSON.stringify( xmlHttpRequest )
      + ",\nStatus Text: " + statusText
      + ",\nError Thrown: " + errorThrown );
});

}

