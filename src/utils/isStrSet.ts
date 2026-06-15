/**
 *
 *  @category String
 *
 *  @param value
 */
export function isStrSet(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
