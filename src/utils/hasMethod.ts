// project modules
import type { TFunction, UnknownObject } from '../types/index.js';

/**
 *  Specifies whether the given object has the specified method.
 *
 *  @category Object
 *
 *  @param {Object} obj - Object to be checked.
 *  @param {String} methodName - Name of the method to be checked.
 *  @return {Boolean}
 */
export function hasMethod<T, R extends keyof T | PropertyKey>(
  value: T,
  methodName: R
): value is T & UnknownObject<R, TFunction> {
  return Boolean(
    value && typeof value === 'object' && typeof value[methodName as keyof T] === 'function'
  );
}
