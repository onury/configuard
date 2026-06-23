/** @internal */
export type IEnumType<T extends string | number = string | number> =
  | { [key in string]: T }
  | { [key in number]: T }
  | { [key in symbol]: T };
