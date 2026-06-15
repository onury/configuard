// project modules

// own modules
import type { IEnumType } from '../types/index.js';
import { toString } from './toString.js';

/**
 * Get keys of enum
 *
 * @param {any} enumType Enum type
 * @returns {string[]} Enum keys
 * @throws {TypeError}
 */
export function getKeys<T extends IEnumType>(enumType: T): (keyof T)[] {
  if (toString(enumType) !== '[object Object]') {
    throw new TypeError('Given value is not enum');
  }

  return Object.keys(enumType).filter((key) => isNaN(Number(key))) as (keyof T)[];
}
