import { typeOf } from './typeOf.js';

/**
 *  Specifies whether the type of the given value is date. Note that this does
 *  not validate the date object. Use `isValidDate()` for validating.
 *
 *  @category Generic
 *
 *  @param {unknown} value - Value to be checked.
 *  @returns {boolean}
 */
export function isDate(value: unknown): value is Date {
  return typeOf(value) === 'date';
}
