/**
 *  Checks whether the given value is set. (not `null` or `undefined`).
 *
 *  @category Generic
 *
 *  @param {any} value - Value to be checked.
 *  @return {Boolean}
 */
export function isset<T>(value: T): value is NonNullable<T> {
  return value !== undefined && value !== null;
}
// alias of .isset()
export function isSet<T>(value: T): value is NonNullable<T> {
  return isset(value);
}
