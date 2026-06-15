/**
 *  Enumerates the types of a list.
 *  @enum {string}
 *  @readonly
 */
export enum ListType {
  /**
   *  Indicates that the value is not a list.
   */
  NONE = 'none',
  /**
   *  Indicates that the value is a list of items and its type is `Array`.
   */
  ARRAY = 'array',
  /**
   *  Indicates that the value is a comma separated list and its type is
   *  `String`.
   */
  CSL = 'csl'
}
