/**
 *  Pads `str` on the left side if it's shorter than `length`. Padding
 *  characters are truncated if they exceed `length`. Thin wrapper around the
 *  native `String.prototype.padStart`.
 *
 *  @category String
 *
 *  @param str - The string to pad.
 *  @param [length=0] - The padding length.
 *  @param [chars=' '] - The string used as padding.
 *  @returns The padded string.
 */
export function padStart(str: string, length = 0, chars = ' '): string {
  return String(str).padStart(length, chars);
}
