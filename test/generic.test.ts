import * as $ from '../src/utils/index.js';

describe('generic', () => {
  test('.isBoolean()', () => {
    expect($.isBoolean(true)).toEqual(true);
    expect($.isBoolean(false)).toEqual(true);
    expect($.isBoolean(0)).toEqual(false);
    expect($.isBoolean(null)).toEqual(false);
  });

  test('.isDate()', () => {
    expect($.isDate(new Date())).toEqual(true);
    expect($.isDate('2019-12-01 00:00:00')).toEqual(false);
    expect($.isDate(null)).toEqual(false);
  });

  test('.typeOf()', () => {
    expect($.typeOf('')).toEqual('string');
    expect($.typeOf(true)).toEqual('boolean');
    expect($.typeOf(null)).toEqual('null');
    expect($.typeOf(undefined)).toEqual('undefined');
    expect($.typeOf(0)).toEqual('number');
    expect($.typeOf(new Date())).toEqual('date');
    expect($.typeOf({})).toEqual('object');
  });

  test('.isset(), .isSet()', () => {
    expect($.isSet('')).toEqual(true);
    expect($.isSet(false)).toEqual(true);
    expect($.isSet(null)).toEqual(false);
    expect($.isSet(undefined)).toEqual(false);
  });
});
