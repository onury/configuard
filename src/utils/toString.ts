import type { UnknownObject } from '../types/index.js';
import { hasMethod } from './hasMethod.js';

/**
 *
 *  @category String
 *
 *  @param value
 */
export function toString(value: unknown): string {
  if (typeof value === 'string') return value;

  if (value === null || value === undefined) return '';

  if (hasMethod(value, 'toString')) {
    return (value as UnknownObject).toString();
  }
  return String(value);
}
