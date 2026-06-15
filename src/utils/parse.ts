import type { UnknownObject } from '../types/index.js';
import { includes } from './includes.js';
import { isHex } from './isHex.js';
import { isNumeric } from './isNumeric.js';
import { isTime } from './isTime.js';
import { isValidDate } from './isValidDate.js';
import { parseBool } from './parseBool.js';
import { parseDate } from './parseDate.js';
import { typeOf } from './typeOf.js';

/**
 *  Parses the given string into a best-guessed type. If parse fails, it
 *  will return the original string. If `type` parameter is passed; it will
 *  force-parse the string which will throw a `TypeError` if parse fails.
 *  NOTE: `'{ "a":1 }'` is parsed OK. `{ a:1 }` parses to string because `a`
 *  is not valid JSON (`"a"`).
 *
 *  @category Parser
 *
 *  @param str String to be parsed.
 *  @param type Strict type to be parsed, in lower-case. e.g.
 *  `"string"`, `"array"`, etc... See ValueType enumeration (covers most of
 *  type values supported here, but not all such as `num`, `array`, etc...)
 *
 *  @returns Parsed value, which can be in any type.
 */
export function parse(str: string, type?: string): unknown {
  type = typeof type === 'string' ? type.trim().toLowerCase() : type;
  if (type === 'any') type = undefined;
  const force: boolean = type !== undefined;

  const mtd = 'parser.parse(): ';
  const ERR_NOT_STR = mtd + 'Passed value should be a string.';
  const ERR_INVALID_TYPE = mtd + 'Invalid type parameter: "' + String(type) + '"';
  const ERR_FORCE_FAIL = mtd + 'Failed to parse "' + str + '"';

  // passed value (str) should be a String!!!
  if (typeof str !== 'string') throw new TypeError(ERR_NOT_STR);

  str = str.trim();

  const ty = (array: unknown[]): boolean => includes(array, type);

  const throwIfNot = (t: string, v: unknown): unknown => {
    if (force && typeOf(v) !== t) {
      throw new TypeError(ERR_FORCE_FAIL + ' to ' + t);
    }
    return v;
  };

  // method to try `JSON.parse()`; if fails, return original
  const jp = (v: string): unknown[] | UnknownObject | string => {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  };

  // method to try `parser.parseDate()` date; if fails, return original
  const dt = (v: string): Date | string | null => {
    const dd = parseDate(v);
    return isValidDate(dd) ? dd : v;
  };

  // method to try `JSON.parse()` to array. if fails, return `.split(',')`
  const arr = (v: string): unknown[] | string => {
    const a = jp(v);
    if (typeOf(a) === 'array') {
      return a as unknown[];
    }
    return v.split(',');
  };

  // method to try `new RegExp()`; if fails, return original
  const regexp = (v: string, o: string = ''): RegExp | string => {
    try {
      return new RegExp(v, o);
    } catch {
      return v;
    }
  };

  // method to try parsing '/regexp/gim' literal format; if fails,
  // return default value
  const re = (s: string, defaultV: string): RegExp | string => {
    const m = s.match(/\/(.*)\/(.*)/);
    return m ? regexp(m[1], m[2]) : defaultV;
  };

  // `type` parameter is passed; so forcing kind of a type-cast
  if (force) {
    // what? :)
    if (ty(['null'])) return null;
    if (ty(['string', 'str', String])) return str;
    if (ty(['boolean', 'bool', Boolean])) {
      return throwIfNot('boolean', parseBool(str));
    }
    if (ty(['num', 'number', Number])) {
      return throwIfNot('number', Number(str));
    }
    if (ty(['hex', 'hexadecimal'])) {
      // Value must be a proper hexadecimal (with or without `0x` prefix).
      // parseInt('1234', 16) === parseInt('0x1234', 16) === Number('0x1234')
      const prefixed = str.slice(0, 2).toLowerCase() === '0x';
      if (!isHex(str, prefixed)) throw new TypeError(ERR_FORCE_FAIL + ' to hexadecimal');
      return throwIfNot('number', parseInt(str, 16));
    }
    if (ty(['f', 'float'])) {
      return throwIfNot('number', parseFloat(str));
    }
    if (ty(['int', 'integer'])) {
      return throwIfNot('number', parseInt(str, 10));
    }
    if (ty(['datetime', Date])) {
      // Date + time. Returns a `Date` (throws if it can't be parsed).
      return throwIfNot('date', dt(str));
    }
    if (ty(['date'])) {
      // Calendar date only (no time part). Returns the validated string.
      // A purely numeric string is rejected (it's not a date string).
      if (isNumeric(str) || /\d{1,2}:\d{2}/.test(str) || !isValidDate(parseDate(str))) {
        throw new TypeError(ERR_FORCE_FAIL + ' to date');
      }
      return str;
    }
    if (ty(['time'])) {
      // Clock time `HH:mm` or `HH:mm:ss`. Returns the validated string.
      if (!isTime(str)) throw new TypeError(ERR_FORCE_FAIL + ' to time');
      return str;
    }
    if (ty(['arr', 'array', Array])) {
      // force-array will not throw, no-matter if `JSON.parse()`
      // fails; it will still succeed to `.split(',')` finally
      return arr(str); // throwIfNot('array', arr(str));
    }
    if (ty(['obj', 'object', Object])) {
      return throwIfNot('object', jp(str));
    }
    if (ty(['json'])) {
      // this will throw if parse fails
      return JSON.parse(str);
    }
    if (ty(['re', 'regexp', RegExp])) {
      return throwIfNot('regexp', re(str, regexp(str) as string));
    }
    throw new TypeError(ERR_INVALID_TYPE);
  }

  // no `type` parameter. auto-parsing...
  if (str === 'null') return null;
  if (str === 'undefined') return undefined;
  if (str === 'true') return true;
  if (str === 'false') return false; // Boolean('false') will return true !!!
  if (str === 'Infinity') return Infinity;
  if (str === 'NaN') return NaN;

  // Try: Hexadecimal
  // http://stackoverflow.com/a/13676265
  // if (isHex(str, true)) return Number(str);

  // Try: Number, Float, Integer
  if (isNumeric(str)) return parseFloat(str);
  // Try: Date
  const d = dt(str);
  if (d !== str) return d;
  // Array, Object, /RegExp/ or String
  const p = jp(str);
  return typeof p === 'string' ? re(str, str) : p;
}
