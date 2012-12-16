
/**
 * Flexible date parse function
 * The date is stored in the object
 * @returns the format string which was used
 */
Date.prototype.setUIDate = function (dateStr) {
  // [[yy]yy-]mm-dd
  //   2  3   4  5
  var regexp = "^(([0-9]{2})?([0-9]{2})-)?([0-9]{1,2})-([0-9]{1,2})$";
  var d = dateStr.match(new RegExp(regexp));
  if (d) {
    if (d[3]) { this.setYear( (d[2]?d[2]:'20') + d[3]); }
    if (d[4]) { this.setMonth(d[4] - 1); }
    if (d[5]) { this.setDate(d[5]); }
    return 'yyyy-mm-dd';
  }

  // mm/dd[/[yy]yy]
  // 1  2    4  5
  var regexp = "^([0-9]{1,2})/([0-9]{1,2})(/([0-9]{2})?([0-9]{2}))?$";
  var d = dateStr.match(new RegExp(regexp));
  if (d) {
    if (d[4]) { this.setYear( (d[4]?d[4]:'20') + d[5]); }
    if (d[1]) { this.setMonth(d[1] - 1); }
    if (d[2]) { this.setDate(d[2]); }
    return 'mm/dd/yyyy';
  }

  // dd.mm[.[yy]yy]
  // 1  2    4  5
  var regexp = "^([0-9]{1,2})\\.([0-9]{1,2})(\\.([0-9]{2})?([0-9]{2}))?$";
  var d = dateStr.match(new RegExp(regexp));
  if (d) {
    if (d[4]) { this.setYear( (d[4]?d[4]:'20') + d[5]); }
    if (d[2]) { this.setMonth(d[2] - 1); }
    if (d[1]) { this.setDate(d[1]); }
    return 'dd.mm.yyyy';
  }

  throw 'unknown date format. use yyyy-mm-dd, mm/dd/yyyy or dd.mm.yyyy';
}

/**
 * Flexible time parse function
 * The time is stored in the object
 * @returns the format string which was used
 */
Date.prototype.setUITime = function (timeStr) {
  // HH[:MM[:SS]]
  // 1   3   5
  var regexp = "^([0-9]{1,2})?(:([0-9]{2})(:([0-9]{2}))?)?$";
  var d = timeStr.match(new RegExp(regexp));
  if (d) {
    if (d[1]) { this.setHours(d[1]);   } else { this.setHours(0); }
    if (d[3]) { this.setMinutes(d[3]); } else { this.setMinutes(0); }
    if (d[5]) { this.setSeconds(d[5]); } else { this.setSeconds(0); }
    this.setMilliseconds(0);
    if (d[5])
      return 'HH:MM:ss';
    else
      return 'HH:MM';
  }

  throw 'unknown time format. use HH:MM or HH:MM:SS';
}


/**
 * Usage example (dRef and tRef are jQuery references)

function parseUIDateTime(dRef, tRef) {
  var date = new Date();
  var s, dFmt, tFmt;

  if (s = dRef.val() )
    dFmt = date.setUIDate( s );
  if (s = tRef.val() )
    tFmt = date.setUITime( s );

  if (dFmt)
    dRef.val(date.format(dFmt));
  if (tFmt)
    tRef.val(date.format(tFmt));

  return date;
}
 */

