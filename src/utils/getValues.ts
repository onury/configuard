import type { IEnumType } from '../types/index.js';
import { getKeys } from './getKeys.js';

/**
 * Get values of enum
 *
 * @param {IEnumType<string | number>} enumType Enum type
 * @returns {string[]|number[]} Enum values
 * @throws {TypeError}
 */
export function getValues<T extends IEnumType>(enumType: T): T[keyof T][] {
  return getKeys(enumType).map((key) => enumType[key]);
}
