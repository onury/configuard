import * as $ from '../src/utils/index.js';

describe('enum utils', () => {
  enum TestNum {
    A,
    B,
    C,
    d
  }
  enum TestDict {
    A = 'AVAL',
    B = 'BVAL',
    C = 'cVal'
  }

  const testNumKeys = ['A', 'B', 'C', 'd'];
  const testNumVals = [0, 1, 2, 3];
  const testDictKeys = ['A', 'B', 'C'];
  const testDictVals = ['AVAL', 'BVAL', 'cVal'];

  test('.getKeys()', () => {
    expect($.getKeys(TestNum)).toEqual(testNumKeys);
    expect($.getKeys(TestDict)).toEqual(testDictKeys);
  });

  test('.getValues()', () => {
    expect($.getValues(TestNum)).toEqual(testNumVals);
    expect($.getValues(TestDict)).toEqual(testDictVals);
  });

  test('.hasValue()', () => {
    expect($.hasValue(TestNum, 0)).toEqual(true);
    expect($.hasValue(TestNum, 4)).toEqual(false);
    expect($.hasValue(TestDict, 'AVAL')).toEqual(true);
    expect($.hasValue(TestDict, 'CVAL')).toEqual(false);
    expect($.hasValue(TestDict, 'CVAL', false)).toEqual(true);
  });
});
