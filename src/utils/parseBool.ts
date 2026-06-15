/**
 *  Parses the given value to Boolean. This is different than coercing via
 *  Boolean constructor. For example, `Boolean('false')` and `Boolean('0')`
 *  will return both `true` but this will return `false`.
 *
 *  @category Parser
 *
 *  @param value - Value to be parsed to `Boolean`.
 */
export function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Boolean(value);

  if (typeof value === 'string') {
    return !(value === '' || value === '0' || value === 'false');
  }
  return Boolean(value);
}
