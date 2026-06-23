/** @internal */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TFunction<T = any, A = any> = (...args: A[]) => T;

/** The built configuration object: a plain, keyed object of parsed values. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UnknownObject<K extends PropertyKey = PropertyKey, V = any> = Record<K, V>;

/** @internal */
export type Collection = UnknownObject | unknown[];

/**
 * Early-Exit callback (return false for exiting the iteration early).
 * @internal
 */
export type ArrayEachCallbackEE<T = unknown> = (item: T, index: number, array: T[]) => void | false;
/**
 * Early-Exit callback (return false for exiting the iteration early).
 * @internal
 */
export type ObjectEachCallbackEE<T = unknown> = (
  value: T,
  key: string,
  object: Record<string, T>
) => void | false;
