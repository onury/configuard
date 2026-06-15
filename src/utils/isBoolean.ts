/**
 *  Specifies whether the type of the given value is boolean.
 *
 *  @category Generic
 *
 *  @param {unknown} value - Value to be checked.
 *  @returns {boolean}
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}
