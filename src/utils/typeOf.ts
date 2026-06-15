const toString = Object.prototype.toString;

/**
 *  Gets the type of the given object.
 *
 *  @category Generic
 *
 *  @param {unknown} object - Object or value to be checked.
 *  @returns {string}
 */
export function typeOf(object: unknown): string {
  const typeString = toString.call(object).match(/\s(\w+)/i) as [string, string];
  return typeString[1].toLowerCase();
}
