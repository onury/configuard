import type { IEnumType } from '../types/index.js';
import { getValues } from './getValues.js';

/**
 * Check if enum has value
 *
 * @param {IEnumType} enumType Enum type
 * @param {string|number} value Value to check in enum
 * @param {boolean} [caseSensitive=true] Whether to check with case-sensitivity
 * @returns {boolean}
 * @throws {TypeError}
 */
export function hasValue<T extends IEnumType>(
  enumType: T,
  value: unknown,
  caseSensitive: boolean = true
): value is T[keyof T] {
  return getValues(enumType).some((v) =>
    caseSensitive || typeof value === 'number'
      ? v === value
      : `${v}`.toUpperCase() === String(value).toUpperCase()
  );
}
