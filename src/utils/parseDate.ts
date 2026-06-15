import { createUTCDate } from './createUTCDate.js';
import { isNumeric } from './isNumeric.js';
import { isValidDate } from './isValidDate.js';

/**
 *  Parses the given value to a Date object.
 *  Supports {@link http://tools.ietf.org/html/rfc2822#page-14|RFC2822} and
 *  ISO 8601. If parse operation fails, returns `null`.
 *
 *  See {@link http://blog.dygraphs.com/2012/03/javascript-and-dates-what-mess.html|this article}.
 *  Tested on Chrome 33 and Firefox 27. Check the hours below:
 *  <pre><code>new Date("2012-03-13")
 *      "Tue Mar 13 2012 02:00:00 GMT+0200 (EET)"
 *  new Date("2012/03/13")
 *      "Tue Mar 13 2012 00:00:00 GMT+0200 (EET)"</code></pre>
 *
 *  Note: No support for 2-digit year (YY), should always be 4-digits (YYYY).
 *  See {@link http://msdn.microsoft.com/en-us/library/ff743760(v=vs.94).aspx|this reference}.
 *
 *  @category Parser
 *
 *  @param {*} value
 *         The value to be parsed to Date.
 *
 *  @returns {Date}
 *           This will return `null` if parse operation fails.
 *
 *  @example
 *  // Examples of the supported formats:
 *      "Fri Jan 17 2014"
 *      "Fri Jan 17 2014 14:28:15 GMT-0200"
 *      "Fri Jan 17 2014 14:28:15 GMT+0200 (EET)"
 *      "Fri Jan 17 2014 02:36:22 GMT-0700 (Pacific Daylight Time)"
 *      "Fri, 17 Jan 2014 00:28:15 GMT"
 *      "Fri, 17 Jan 2014 00:28:15"
 *      "Jan 17, 2014"
 *      "Jan 17, 2014 14:40:30"
 *      "Jan 17, 2014 2:28:15 PM"
 *      "01/17/2014"
 *      "1/17/2014"
 *      "1/17/2014 14:28"
 *      "1/17/2014 14:28:15"
 *      "1/17/2014 2:28:15 AM"
 *      "2014/1"
 *      "2014-1"
 *      "2014/1/17"
 *      "2014/01/17"
 *      "2014-1-17"
 *      "2014-01-17"
 *      "2014/01/17 14:28"
 *      "2014/01/17 14:28:15"
 *      "2014/01/17 14:28:15.789"
 *      "2014-01-17 14:28"
 *      "2014-01-17 14:28:15"
 *      "2014-01-17T14:28:15"
 *      "2014-01-17T14:28:15Z"
 *      "2014-01-17T14:28:15.789Z"
 *      "2014-01-17T14:28:15+0200"
 *      "2014-01-17T14:28:15+2:00"
 *      "2014-01-17T14:28:15-4:30"
 *      1389918495000 // epoch milliseconds
 */
export function parseDate(value: string): Date | null {
  // TODO: Needs tests.
  let d;
  // check if value is date already
  if (isValidDate(value)) {
    return value as unknown as Date;
  }

  // check if value is numeric.
  // new Date("2000")     » Sat Jan 01 2000 02:00:00 GMT+0200 (EET)
  // new Date(2000)       » Thu Jan 01 1970 02:00:02 GMT+0200 (EET)
  // new Date("12345.67") » Invalid Date
  // new Date(12345.67)   » Thu Jan 01 1970 02:00:12 GMT+0200 (EET)
  if (isNumeric(value)) {
    d = new Date(parseFloat(value));
    if (isValidDate(d)) return d;
    return null;
  }

  // now failover to internal method before
  // trusting Date constructor with strings
  d = parseFDate(value);
  if (d) return d;

  // finally try if we can parse with built in Date constructor
  d = new Date(value);
  if (isValidDate(d)) return d;

  // not possible to parse...
  return null;
}

// Helper function for parser.parseDate()
// Parses formats without month/day names: mm dd yyyy ..., yyyy mm dd ...
function parseFDate(value: string): Date | null {
  value = String(value).toUpperCase();
  let day: number;
  let month: number;
  let year: number;
  // eslint-disable-next-line
  const p =
    /^(?:(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})|(\d{4})[-/.](1[012]|0?[1-9])[-/.](\d{1,2}))(?:[ T](\d?\d):(\d\d)(?::(\d\d))?)?(?:\.(\d+)Z?|([+-]\d{4}|[+-]\d?\d:\d\d)|Z| ([AP]M))?$/;
  const m = value.match(p);
  // leaving these undefined would parse Invalid Date
  let hour: number | null = null;
  let min: number | null = null;
  let sec: number | null = null;
  let ms: number | null = null;

  const dt = (): Date | null => {
    const d = createUTCDate(
      year,
      month,
      day,
      hour as number,
      min as number,
      sec as number,
      ms as number
    );
    /* istanbul ignore next -- defensive: components are validated before dt(). */
    return isValidDate(d) ? d : null;
  };

  // apply GMT offset
  const offset = (date: Date | null, strGMT: string): Date | null => {
    /* istanbul ignore next -- defensive: dt() yields a valid date here. */
    if (!date) return null;

    // strGMT examples: "+0430"  "-0200"  "-2:30"  "+03:00"
    if (!strGMT) return date;
    let n: number;
    let o: number;
    const mo = strGMT.match(/([+-])(\d?\d):?(\d\d)/);

    /* istanbul ignore else -- defensive: the outer regex guarantees `mo` matches. */
    if (mo && mo.length === 4) {
      n = mo[1] === '+' ? 1 : -1; // reverse
      o = (parseInt(mo[2], 10) * 60 + parseInt(mo[3], 10)) * n; // parsed offset: ((hours * 60) + minutes) * n
      return new Date(date.setMinutes(date.getMinutes() - o));
    }

    /* istanbul ignore next -- defensive: the outer regex only captures a
       well-formed offset into `strGMT`, so `mo` always matches here. */
    return null;
  };

  if (m) {
    if (m[1]) {
      // first section of date (mm dd yyyy) is matched
      month = parseInt(m[1], 10) - 1; // month is zero-based
      day = parseInt(m[2], 10);
      year = parseInt(m[3], 10);
    } else {
      // second section of date (yyyy mm dd) is matched
      year = parseInt(m[4], 10);
      month = parseInt(m[5], 10) - 1; // month is zero-based
      day = parseInt(m[6], 10);
    }

    // month should be <= 11
    if (month > 11 || day > 31) return null;

    if (m[7]) {
      // hours
      hour = parseInt(m[7], 10);
      if (m[12] === 'PM') hour += 12; // AM|PM

      /* istanbul ignore else -- defensive: the time regex couples hour with
         minutes, so a matched hour (m[7]) always implies a matched minute. */
      if (m[8]) {
        // minutes
        min = parseInt(m[8], 10);

        if (m[9]) {
          // seconds
          sec = parseInt(m[9], 10);
          if (m[10]) ms = parseInt(m[10], 10); // milliseconds
          return offset(dt(), m[11]); // return with timezone offset
        }

        return dt();
      }

      /* istanbul ignore next -- defensive: unreachable (see above). */
      return null; // min should exist where hour exists
    }

    return dt();
  }

  // This rules out formats such as YYYY MM DD, DD MM YYYY, etc..
  return null;
}
