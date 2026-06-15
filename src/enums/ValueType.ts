/**
 * Enumerates the value types for a configuration item. This is typically used
 * with config database tables: a row's raw string `value` is parsed into a JS
 * value according to its `type`.
 * @enum {string}
 * @readonly
 */
export enum ValueType {
  /** The value is `null`. */
  NULL = 'null',
  /** Parsed as-is, a `string`. */
  STRING = 'string',
  /** Parsed into a `boolean` (e.g. `"true"`/`"1"` -> `true`). */
  BOOLEAN = 'boolean',
  /** Parsed into a `number` (integer or float). */
  NUMBER = 'number',
  /** Parsed into an integer `number` (base 10). */
  INTEGER = 'integer',
  /** Parsed into a floating-point `number`. */
  FLOAT = 'float',
  /**
   * A hexadecimal string (with or without a `0x` prefix), parsed into a
   * `number`. Invalid hex throws.
   */
  HEXADECIMAL = 'hexadecimal',
  /**
   * A date **and** time string, parsed into a `Date` object (RFC 2822 / ISO
   * 8601). Use this when the value carries a time component.
   */
  DATETIME = 'datetime',
  /**
   * A calendar date **without** a time part (e.g. `"2026-06-15"`). Kept as the
   * validated `string` — it is not converted to a `Date`. A value that
   * includes a time, or that isn't a valid date, throws.
   */
  DATE = 'date',
  /**
   * A clock time in `HH:mm` or `HH:mm:ss` format (e.g. `"14:30"`,
   * `"23:59:59"`). Kept as the validated `string`. Out-of-range values such as
   * `"90:77"` throw.
   */
  TIME = 'time',
  /** A `/pattern/flags` (or plain pattern) string, parsed into a `RegExp`. */
  REGEXP = 'regexp',
  /** A JSON string, parsed via `JSON.parse` (object, array, etc.). */
  JSON = 'json',
  /** Best-effort auto-detection of the value's type. */
  ANY = 'any'
}
