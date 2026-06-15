/**
 *  Checks whether the given string is a valid clock time in `HH:mm` or
 *  `HH:mm:ss` format. Each field must be two digits and within range, so
 *  `"90:77"` or `"00:10:99"` are invalid while `"14:30"` and `"23:59:59"`
 *  are valid.
 *
 *  @category String
 *
 *  @param value String to be checked.
 *  @returns Whether the value is a valid `HH:mm`/`HH:mm:ss` time.
 */
export function isTime(value: string): boolean {
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!m) return false;

  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  const seconds = m[3] === undefined ? 0 : Number(m[3]);

  return hours <= 23 && minutes <= 59 && seconds <= 59;
}
