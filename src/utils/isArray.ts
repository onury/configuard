import { typeOf } from './typeOf.js';

/**
 *  Specifies whether the type of the given value is array.
 *
 *  @category Generic
 *
 *  @param {unknown} value - Value to be checked.
 *  @returns {boolean}
 */
export function isArray<T>(value: T[] | unknown): value is T[] {
  return typeOf(value) === 'array';
}
