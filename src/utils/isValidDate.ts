import { typeOf } from './typeOf.js';

/**
 *  Checks whether the type of the specified value is Date.
 *  `new Date('not a date')` will pass `_.isDate(value)` or `utils.type(value) === 'date'`
 *  but actually, it will produce the weird Invalid Date object.
 *  So we also test for `getTime()`
 *
 *  @category Date
 *
 *  @param {*} value
 *  @return {Boolean}
 */
export function isValidDate(value: unknown): value is Date {
  return typeOf(value) === 'date' && !isNaN((value as Date).getTime());
}
