// own modules
import type { IEnumType } from '../types/IEnumType.js';

/** Get key of enum by value */
export function getKey<T extends IEnumType>(enumType: T, value: T[keyof T]): undefined | keyof T {
  return Object.keys(enumType).find((k) => enumType[k] === value) as undefined | keyof T;
}
