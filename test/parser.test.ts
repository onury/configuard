import * as $ from '../src/utils/index.js';

describe('parser', () => {
  test('.parseBool()', () => {
    expect($.parseBool('true')).toEqual(true);
    expect($.parseBool('false')).toEqual(false);
    expect($.parseBool('0')).toEqual(false);
    expect($.parseBool(0)).toEqual(false);
    expect($.parseBool('1')).toEqual(true);
    expect($.parseBool(1)).toEqual(true);
    expect($.parseBool('')).toEqual(false);
    expect($.parseBool(true)).toEqual(true);
    expect($.parseBool(false)).toEqual(false);
    expect($.parseBool([])).toEqual(true);
  });

  test('.parseDate()', () => {
    let d = $.parseDate('01/17/2014');
    expect(d).toEqual(expect.any(Date));
    expect(d?.getFullYear()).toEqual(2014);

    d = $.parseDate('2/17/2014 14:28');
    expect(d).toEqual(expect.any(Date));
    expect(d?.getMonth()).toEqual(1); // 0-based index

    d = $.parseDate('Fri Jan 17 2016 14:28:15 GMT-0200');
    expect(d).toEqual(expect.any(Date));
    expect(d?.getMonth()).toEqual(0); // 0-based index
    expect(d?.getDate()).toEqual(17);

    d = $.parseDate('Mar 25, 2017 2:28:15 PM');
    expect(d).toEqual(expect.any(Date));
    expect(d?.getMonth()).toEqual(2); // 0-based index
    expect(d?.getDate()).toEqual(25);
    expect(d?.getFullYear()).toEqual(2017);

    d = $.parseDate('2018/1');
    expect(d).toEqual(expect.any(Date));
    expect(d?.getMonth()).toEqual(0); // 0-based index
    expect(d?.getDate()).toEqual(1);
    expect(d?.getFullYear()).toEqual(2018);

    d = $.parseDate('2018-09-30');
    expect(d).toEqual(expect.any(Date));
    expect(d?.getMonth()).toEqual(8); // 0-based index
    expect(d?.getDate()).toEqual(30);
    expect(d?.getFullYear()).toEqual(2018);

    d = $.parseDate('2018-09-30 14:28:15.789');
    expect(d).toEqual(expect.any(Date));
    expect(d?.getMonth()).toEqual(8); // 0-based index
    expect(d?.getDate()).toEqual(30);
    expect(d?.getFullYear()).toEqual(2018);
    expect(d?.getUTCHours()).toEqual(14);

    d = $.parseDate('1389918495000');
    expect(d).toEqual(expect.any(Date));
    expect(d?.getMonth()).toEqual(0); // 0-based index
    expect(d?.getDate()).toEqual(17);
    expect(d?.getFullYear()).toEqual(2014);
    expect(d?.getUTCHours()).toEqual(0);

    d = $.parseDate(1389918495000 as unknown as string);
    expect(d).toEqual(expect.any(Date));
    expect(d?.getMonth()).toEqual(0); // 0-based index
    expect(d?.getDate()).toEqual(17);
    expect(d?.getFullYear()).toEqual(2014);
    expect(d?.getUTCHours()).toEqual(0);

    d = $.parseDate('1/17/2014 20:45:00-08:30') as Date;
    expect(d).toEqual(expect.any(Date));
    expect(d.getDate()).toEqual(18);
    expect(d.getUTCHours()).toEqual(5);
    expect(d.getUTCMinutes()).toEqual(15);

    d = $.parseDate('1/18/2014 05:15:00+08:30') as Date;
    expect(d).toEqual(expect.any(Date));
    expect(d.getDate()).toEqual(17);
    expect(d.getUTCHours()).toEqual(20);
    expect(d.getUTCMinutes()).toEqual(45);

    d = $.parseDate('1/18/2014 05:15:00 PM') as Date;
    expect(d).toEqual(expect.any(Date));
    expect(d.getUTCHours()).toEqual(17);

    const now = new Date();
    expect($.parseDate(now as unknown as string)).toEqual(now);

    expect($.parseDate(Number.MAX_SAFE_INTEGER as unknown as string)).toEqual(null);
    expect($.parseDate('2020-13-32')).toEqual(null);
  });

  test('.parse()', () => {
    const p = $.parse;
    expect(() => p(1 as unknown as string)).toThrow(/should be a string/); // expects a string
    expect(p('42', 'NUMBER')).toEqual(42); // type is trimmed + lower-cased
    expect(p('  true  ', 'Boolean')).toEqual(true);
    expect(p('1')).toEqual(1);
    expect(p('1 ')).toEqual(1);
    expect(p('true')).toEqual(true);
    expect(p('null')).toEqual(null);
    expect(p('undefined')).toEqual(undefined);
    expect(p('Infinity')).toEqual(Infinity);
    expect(p('NaN')).toEqual(NaN);
    expect(p('1.5')).toEqual(1.5);
    expect(p('2018-01-01')).toEqual(expect.any(Date));
    expect(p('[1,2,3]')).toEqual(expect.any(Array));
    expect(p('["a", "b"]')).toEqual(expect.any(Array));
    expect(p('/A-Z/')).toEqual(expect.any(RegExp));
    // eslint-disable-next-line no-useless-escape
    expect(p('/(?:W+)/gm')).toEqual(expect.any(RegExp)); // ??? \W escape char useless?
    expect(p('/[1,2]{3,4}/')).toEqual(expect.any(RegExp));
    // expect(p('{ a: 1 }')).toEqual(expect.any(Object)); // ??

    expect(p('text', 'str')).toEqual('text');
    expect(p('text', 'string')).toEqual('text');
    expect(() => p(null as unknown as string, 'integer')).toThrow();
  });

  test('.parse() hexadecimal', () => {
    const p = $.parse;
    expect(p('1A', 'hexadecimal')).toEqual(26);
    expect(p('0xFF', 'hexadecimal')).toEqual(255);
    expect(() => p('zz', 'hexadecimal')).toThrow(/Failed to parse "zz" to hexadecimal/);
    expect(() => p('', 'hexadecimal')).toThrow(/to hexadecimal/);
  });

  test('.parse() datetime vs date vs time', () => {
    const p = $.parse;
    // datetime -> Date
    expect(p('2026-06-15 14:30', 'datetime')).toEqual(expect.any(Date));
    // date -> validated string, no time part allowed
    expect(p('2026-06-15', 'date')).toEqual('2026-06-15');
    expect(() => p('2026-06-15 14:30', 'date')).toThrow(/to date/);
    expect(() => p('8081', 'date')).toThrow(/to date/);
    expect(() => p('not a date', 'date')).toThrow(/to date/);
    // time -> validated string, two-digit ranged fields
    expect(p('14:30', 'time')).toEqual('14:30');
    expect(p('23:59:59', 'time')).toEqual('23:59:59');
    expect(() => p('90:77', 'time')).toThrow(/to time/);
    expect(() => p('00:10:99', 'time')).toThrow(/to time/);
    expect(() => p('9:30', 'time')).toThrow(/to time/);
  });

  test('.parse() number / integer / float', () => {
    const p = $.parse;
    expect(p('42', 'number')).toEqual(42);
    expect(p('3.14', 'number')).toEqual(3.14);
    expect(p('42px', 'integer')).toEqual(42); // parseInt tolerates trailing
    expect(p('3.14', 'integer')).toEqual(3);
    expect(p('1.5', 'float')).toEqual(1.5);
    expect(p('2', 'float')).toEqual(2);
    // NaN is still typeof 'number' (does not throw), but is NaN
    expect(Number.isNaN(p('abc', 'number') as number)).toEqual(true);
  });

  test('.parse() boolean', () => {
    const p = $.parse;
    expect(p('true', 'boolean')).toEqual(true);
    expect(p('false', 'boolean')).toEqual(false);
    expect(p('1', 'bool')).toEqual(true);
    expect(p('0', 'bool')).toEqual(false);
  });

  test('.parse() array (json or comma-split)', () => {
    const p = $.parse;
    expect(p('[1, 2, 3]', 'array')).toEqual([1, 2, 3]); // valid JSON array
    expect(p('a,b,c', 'array')).toEqual(['a', 'b', 'c']); // falls back to split
    expect(p('solo', 'array')).toEqual(['solo']);
  });

  test('.parse() object (json) — valid and invalid', () => {
    const p = $.parse;
    expect(p('{"a":1}', 'object')).toEqual({ a: 1 });
    expect(() => p('not-json', 'object')).toThrow(/Failed to parse "not-json" to object/);
  });

  test('.parse() json — valid and invalid', () => {
    const p = $.parse;
    expect(p('{"a":[1,2]}', 'json')).toEqual({ a: [1, 2] });
    expect(p('"hi"', 'json')).toEqual('hi');
    expect(() => p('{bad', 'json')).toThrow();
  });

  test('.parse() regexp — valid and invalid', () => {
    const p = $.parse;
    expect(p('/[a-z]+/gi', 'regexp')).toEqual(/[a-z]+/gi); // exact pattern + flags
    expect(p('plain', 'regexp')).toEqual(/plain/); // compiled as /plain/
    expect(() => p('[', 'regexp')).toThrow(/Failed to parse "\[" to regexp/);
  });

  test('.parse() null, "any", and unknown type', () => {
    const p = $.parse;
    expect(p('anything', 'null')).toEqual(null);
    expect(p('any', 'any')).toEqual('any'); // 'any' is treated as no-type (auto)
    expect(p('42', 'any')).toEqual(42); // ...so auto-detect applies
    expect(() => p('x', 'bogus-type')).toThrow(/Invalid type parameter: "bogus-type"/);
  });

  test('.parse() auto-detect (no type)', () => {
    const p = $.parse;
    expect(p('null')).toEqual(null);
    expect(p('undefined')).toBeUndefined();
    expect(p('true')).toEqual(true);
    expect(p('false')).toEqual(false);
    expect(p('Infinity')).toEqual(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(p('NaN') as number)).toEqual(true);
    expect(p('1.5')).toEqual(1.5); // numeric
    expect(p('2014-01-17')).toEqual(expect.any(Date)); // date
    expect(p('{"k":1}')).toEqual({ k: 1 }); // object via JSON
    expect(p('/ab+c/')).toEqual(expect.any(RegExp)); // /regexp/ literal
    expect(p('just text')).toEqual('just text'); // falls back to string
  });
});
