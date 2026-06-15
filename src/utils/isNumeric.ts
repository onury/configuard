/**
 *
 *  @category String
 *
 *  @param value
 */
export function isNumeric(value: string): boolean {
  if (/^[\d.]+$/.test(String(value)) === false) return false;

  const n: number = parseFloat(value);
  return !isNaN(n) && isFinite(n);
}
