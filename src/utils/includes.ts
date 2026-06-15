/**
 *  Checks if `target` is in `collection` using SameValueZero equality
 *  comparisons (so `NaN` matches `NaN`). The collection is an array (checked by
 *  items) or a plain object (checked by its own enumerable values). Unlike
 *  `lodash.includes`, strings are not treated as collections.
 *
 *  @category Object
 *
 *  @param collection - The collection to search (array or object).
 *  @param target - The value to search for.
 *  @returns `true` if `target` is found, else `false`.
 */
export function includes(
  collection: unknown[] | Record<PropertyKey, unknown>,
  target: unknown
): boolean {
  if (Array.isArray(collection)) {
    return collection.includes(target);
  }
  if (collection !== null && typeof collection === 'object') {
    return Object.values(collection).includes(target);
  }
  return false;
}
