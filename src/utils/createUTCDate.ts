import { padStart } from './padStart.js';

/**
 *  Creates a date object with UTC value. Unlike `new Date(Date.UTC(...))` this
 *  method supports years between 0 and 100.
 *
 *  @category Date
 *
 *  @param {number} year - Year of date.
 *  @param {number} monthIndex - Month (index) of date.
 *  @param {number} [day=1] - Day of date.
 *  @param {number} [hours=0] - Hours of date.
 *  @param {number} [minutes=0] - Minutes of date.
 *  @param {number} [seconds=0] - Seconds of date.
 *  @param {number} [milliseconds=0] - Milliseconds of date.
 *  @return {Date} - UTC Date.
 */
export function createUTCDate(
  year: number,
  monthIndex: number = 0,
  day: number = 1,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0,
  milliseconds: number = 0
): Date {
  // JS CAVEAT: Although equivalent, Date.UTC(0, 0, 1, 0, 0, 0, 0).getFullYear() is `1900`
  // but actually new Date('0000-01-01T00:00:00.000Z').getFullYear() is `0`.

  // The reason is; if year is between 0 and <100, JS Date and Date.UTC
  // constructors will pad the year to 1900s.
  // e.g. new Date(100, 0, 1, 0, 0, 0, 0).getFullYear() === 100
  // e.g. new Date(99, 0, 1, 0, 0, 0, 0).getFullYear() === 1999
  // e.g. new Date(0, 0, 1, 0, 0, 0, 0).getFullYear() === 1900
  // e.g. new Date(-1, 0, 1, 0, 0, 0, 0).getFullYear() === -1

  // Safest thing is passing an ISO 8601 string to date constructor

  if (year < 0 || year > 99) {
    return new Date(Date.UTC(year, monthIndex, day, hours, minutes, seconds, milliseconds));
  }

  const month = (monthIndex || 0) + 1;
  const d = [
    padStart(String(year), 4, '0'),
    padStart(String(month), 2, '0'),
    padStart(String(day), 2, '0')
  ].join('-');

  const t = [
    padStart(String(hours), 2, '0'),
    padStart(String(minutes), 2, '0'),
    padStart(String(seconds), 2, '0')
  ].join(':');

  const ms = padStart(String(milliseconds), 3, '0');

  const s = `${d}T${t}.${ms}Z`;
  return new Date(s);
}
