import { AccessorType, ValueType } from '../src/enums/index.js';
import { getKey } from '../src/utils/getKey.js';
import { hasMethod } from '../src/utils/hasMethod.js';
import * as $ from '../src/utils/index.js';

describe('utils: type guards', () => {
  test('typeOf()', () => {
    expect($.typeOf('s')).toEqual('string');
    expect($.typeOf(1)).toEqual('number');
    expect($.typeOf(true)).toEqual('boolean');
    expect($.typeOf([])).toEqual('array');
    expect($.typeOf({})).toEqual('object');
    expect($.typeOf(null)).toEqual('null');
    expect($.typeOf(undefined)).toEqual('undefined');
    expect($.typeOf(new Date())).toEqual('date');
    expect($.typeOf(/a/)).toEqual('regexp');
  });

  test('isArray() / isBoolean() / isDate() / isValidDate()', () => {
    expect($.isArray([1])).toEqual(true);
    expect($.isArray('x')).toEqual(false);
    expect($.isBoolean(false)).toEqual(true);
    expect($.isBoolean(0)).toEqual(false);
    expect($.isDate(new Date())).toEqual(true);
    expect($.isDate('2020')).toEqual(false);
    expect($.isValidDate(new Date('2020-01-01'))).toEqual(true);
    expect($.isValidDate(new Date('nope'))).toEqual(false);
    expect($.isValidDate('2020' as unknown)).toEqual(false);
  });

  test('isNumeric() / isStrSet() / isset()', () => {
    expect($.isNumeric('1.5')).toEqual(true);
    expect($.isNumeric('0')).toEqual(true);
    expect($.isNumeric('007')).toEqual(true);
    expect($.isNumeric('x')).toEqual(false); // fails the digit regex
    expect($.isNumeric('12a')).toEqual(false);
    expect($.isNumeric('')).toEqual(false);
    expect($.isNumeric('.')).toEqual(false); // passes regex, but parseFloat -> NaN
    expect($.isNumeric('...')).toEqual(false);
    expect($.isStrSet('a')).toEqual(true);
    expect($.isStrSet('')).toEqual(false);
    expect($.isStrSet('   ')).toEqual(false); // whitespace-only is not "set"
    expect($.isStrSet(0 as unknown as string)).toEqual(false); // non-string
    expect($.isStrSet(null as unknown as string)).toEqual(false);
    expect($.isset(0)).toEqual(true);
    expect($.isset('')).toEqual(true);
    expect($.isset(false)).toEqual(true);
    expect($.isset(null)).toEqual(false);
    expect($.isset(undefined)).toEqual(false);
  });

  test('isHex()', () => {
    expect($.isHex('1A')).toEqual(true);
    expect($.isHex('ff')).toEqual(true);
    expect($.isHex('zz')).toEqual(false);
    expect($.isHex('zz1A')).toEqual(false); // anchored at start (^)
    expect($.isHex('1Azz')).toEqual(false); // anchored at end ($)
    expect($.isHex('0xFF', true)).toEqual(true);
    expect($.isHex('FF', true)).toEqual(false); // missing 0x prefix
    expect($.isHex('0xZZ', true)).toEqual(false);
    expect($.isHex('0xFFzz', true)).toEqual(false); // anchored at end ($)
  });

  test('isTime()', () => {
    expect($.isTime('00:00')).toEqual(true);
    expect($.isTime('23:00')).toEqual(true); // hour boundary
    expect($.isTime('00:59')).toEqual(true); // minute boundary
    expect($.isTime('23:59:59')).toEqual(true); // all upper bounds
    expect($.isTime('14:30')).toEqual(true);
    expect($.isTime('14:30:00')).toEqual(true); // with seconds
    expect($.isTime('9:30')).toEqual(false); // single-digit hour
    expect($.isTime('24:00')).toEqual(false); // hour > 23
    expect($.isTime('12:60')).toEqual(false); // minute > 59
    expect($.isTime('12:30:60')).toEqual(false); // second > 59
    expect($.isTime('12:30:')).toEqual(false); // trailing colon
    expect($.isTime('noon')).toEqual(false);
  });

  test('hasMethod()', () => {
    expect(hasMethod({ go: () => 1 }, 'go')).toEqual(true);
    expect(hasMethod({ go: 1 }, 'go')).toEqual(false);
    expect(hasMethod({}, 'go')).toEqual(false);
    expect(hasMethod(null, 'go')).toEqual(false);
    expect(hasMethod(5 as unknown, 'toString')).toEqual(false); // primitive
  });
});

describe('utils: string', () => {
  test('padStart()', () => {
    expect($.padStart('5', 3, '0')).toEqual('005');
    expect($.padStart('abc', 2, '0')).toEqual('abc'); // already long enough
    expect($.padStart('7')).toEqual('7'); // default length 0
    expect($.padStart(42 as unknown as string, 4, '0')).toEqual('0042');
  });

  test('toString()', () => {
    expect($.toString('x')).toEqual('x');
    expect($.toString(null)).toEqual('');
    expect($.toString(undefined)).toEqual('');
    expect($.toString(123)).toEqual('123');
    expect($.toString([1, 2])).toEqual('1,2');
    // value whose `toString` is not callable → falls through to String()
    expect($.toString({ toString: null, valueOf: () => 42 })).toEqual('42');
  });
});

describe('utils: enum', () => {
  test('getKey()', () => {
    expect(getKey(AccessorType, AccessorType.SYSTEM)).toEqual('SYSTEM');
    expect(getKey(AccessorType, 'nope' as AccessorType)).toBeUndefined();
  });

  test('getKeys()', () => {
    expect($.getKeys(AccessorType)).toEqual(['SYSTEM', 'APPLICATION', 'ALL']);
    expect($.getKeys(ValueType)).toContain('JSON');
    expect(() => $.getKeys('not-an-enum' as unknown as Record<string, string>)).toThrow(/not enum/);
  });

  test('getValues()', () => {
    expect($.getValues(AccessorType)).toEqual(['system', 'application', 'all']);
    expect($.getValues(ValueType)).toContain('hexadecimal');
  });

  test('hasValue()', () => {
    expect($.hasValue(AccessorType, 'system')).toEqual(true);
    expect($.hasValue(AccessorType, 'nope')).toEqual(false);
    expect($.hasValue(AccessorType, 'SYSTEM')).toEqual(false); // case-sensitive by default
    expect($.hasValue(AccessorType, 'SYSTEM', false)).toEqual(true); // case-insensitive
    expect($.hasValue(ValueType, 'date')).toEqual(true);
    // numeric enum values are compared strictly (the `typeof number` branch)
    enum Num {
      A = 1,
      B = 2
    }
    expect($.hasValue(Num, 2)).toEqual(true);
    expect($.hasValue(Num, 9)).toEqual(false);
    expect($.hasValue(Num, 2, false)).toEqual(true); // case-insensitive flag is ignored for numbers
  });
});

describe('utils: includes', () => {
  test('arrays, objects, and non-collections', () => {
    expect($.includes([1, 2, 3], 2)).toEqual(true);
    expect($.includes([1, 2, 3], 9)).toEqual(false);
    expect($.includes([Number.NaN], Number.NaN)).toEqual(true); // SameValueZero
    expect($.includes({ a: 1, b: 2 }, 2)).toEqual(true);
    expect($.includes({ a: 1 }, 9)).toEqual(false);
    expect($.includes(null as unknown as unknown[], 1)).toEqual(false);
  });
});

describe('utils: createUTCDate', () => {
  test('year 0–99 uses the ISO-string path (exact)', () => {
    expect($.createUTCDate(50, 0, 1, 1, 2, 3, 4).toISOString()).toEqual('0050-01-01T01:02:03.004Z');
    // each component is placed correctly (kills field-swap mutants)
    expect($.createUTCDate(7, 10, 23, 4, 5, 6, 7).toISOString()).toEqual(
      '0007-11-23T04:05:06.007Z'
    );
  });

  test('defaults and the year > 99 path (exact)', () => {
    expect($.createUTCDate(25).toISOString()).toEqual('0025-01-01T00:00:00.000Z'); // month/day default
    expect($.createUTCDate(2026, 5, 15).getTime()).toEqual(Date.UTC(2026, 5, 15));
    expect($.createUTCDate(2026, 5, 15, 10, 30, 45, 500).getTime()).toEqual(
      Date.UTC(2026, 5, 15, 10, 30, 45, 500)
    );
  });
});

describe('utils: parseBool / parseDate', () => {
  test('parseBool() across every input class', () => {
    // booleans pass through
    expect($.parseBool(true)).toEqual(true);
    expect($.parseBool(false)).toEqual(false);
    // numbers: 0 is false, anything else true
    expect($.parseBool(0)).toEqual(false);
    expect($.parseBool(1)).toEqual(true);
    expect($.parseBool(-1)).toEqual(true);
    // strings: only '', '0', 'false' are false
    expect($.parseBool('')).toEqual(false);
    expect($.parseBool('0')).toEqual(false);
    expect($.parseBool('false')).toEqual(false);
    expect($.parseBool('1')).toEqual(true);
    expect($.parseBool('true')).toEqual(true);
    expect($.parseBool('00')).toEqual(true); // not exactly '0'
    expect($.parseBool('False')).toEqual(true); // case-sensitive
    expect($.parseBool('no')).toEqual(true);
    // other types coerce via Boolean()
    expect($.parseBool(null)).toEqual(false);
    expect($.parseBool(undefined)).toEqual(false);
    expect($.parseBool([])).toEqual(true);
    expect($.parseBool({})).toEqual(true);
  });

  test('parseDate() returns exact UTC timestamps', () => {
    expect($.parseDate('2014-01-17')?.getTime()).toEqual(Date.UTC(2014, 0, 17));
    expect($.parseDate('01/17/2014 14:28:15')?.getTime()).toEqual(
      Date.UTC(2014, 0, 17, 14, 28, 15)
    );
    expect($.parseDate('1/17/2014 14:28')?.getTime()).toEqual(Date.UTC(2014, 0, 17, 14, 28, 0));
    expect($.parseDate('2014-01-17 14:28:15.789')?.getTime()).toEqual(
      Date.UTC(2014, 0, 17, 14, 28, 15, 789)
    );
    // 12-hour clock with PM -> +12h
    expect($.parseDate('1/17/2014 2:28:15 PM')?.getTime()).toEqual(
      Date.UTC(2014, 0, 17, 14, 28, 15)
    );
    // timezone offsets normalize to UTC
    expect($.parseDate('2014-01-17 14:28:15+0200')?.getTime()).toEqual(
      Date.UTC(2014, 0, 17, 12, 28, 15)
    );
    expect($.parseDate('2014-01-17 14:28:15-0430')?.getTime()).toEqual(
      Date.UTC(2014, 0, 17, 18, 58, 15)
    );
    // numeric epoch
    expect($.parseDate('1389918495000')?.getTime()).toEqual(1389918495000);
    // month-name format (via the Date constructor path)
    expect($.parseDate('Jan 17, 2014')?.getFullYear()).toEqual(2014);
    // out-of-range month/day -> null
    expect($.parseDate('13/01/2014')).toEqual(null); // month 13
    expect($.parseDate('01/32/2014')).toEqual(null); // day 32
    // unparseable
    expect($.parseDate('definitely not a date')).toEqual(null);
  });
});
