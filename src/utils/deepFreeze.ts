/**
 * Recursively freezes the given value, making it (and every nested object and
 * array it contains) immutable. Primitives, `null` and functions are returned
 * as-is.
 *
 * @category Utility
 *
 * @param o Value to deep-freeze.
 * @returns The same value, now deeply frozen.
 */
export function deepFreeze<T>(o: T): T {
  // Only objects and arrays are frozen; primitives, `null` and functions are
  // already immutable (or irrelevant) for config purposes and pass through.
  if (o === null || typeof o !== 'object') return o;
  for (const key of Object.getOwnPropertyNames(o)) {
    deepFreeze((o as Record<string, unknown>)[key]);
  }
  return Object.freeze(o);
}
