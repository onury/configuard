/**
 *
 *  @category String
 *
 *  @param value
 *  @param prefixed
 */
export function isHex(value: string, prefixed: boolean = false): boolean {
  return prefixed ? /^0x[0-9A-F]+$/i.test(value) : /^[0-9A-F]+$/i.test(value);
}
