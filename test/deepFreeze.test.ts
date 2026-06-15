import { deepFreeze } from '../src/utils/index.js';

describe('deepFreeze', () => {
  it('freezes a plain object', () => {
    const o = { a: 1 };
    const r = deepFreeze(o);
    expect(r).toBe(o); // same reference
    expect(Object.isFrozen(o)).toEqual(true);
  });

  it('recursively freezes nested objects', () => {
    const o = { a: { b: { c: 1 } } };
    deepFreeze(o);
    expect(Object.isFrozen(o)).toEqual(true);
    expect(Object.isFrozen(o.a)).toEqual(true);
    expect(Object.isFrozen(o.a.b)).toEqual(true);
  });

  it('recursively freezes arrays and objects within arrays', () => {
    const o = { list: [{ x: 1 }, { y: 2 }] };
    deepFreeze(o);
    expect(Object.isFrozen(o.list)).toEqual(true);
    expect(Object.isFrozen(o.list[0])).toEqual(true);
    expect(Object.isFrozen(o.list[1])).toEqual(true);
    // a frozen nested object cannot be mutated.
    expect(() => {
      (o.list[0] as { x: number }).x = 99;
    }).toThrow();
    expect(o.list[0].x).toEqual(1);
  });

  it('returns primitives, null and undefined unchanged', () => {
    expect(deepFreeze(5)).toEqual(5);
    expect(deepFreeze('s')).toEqual('s');
    expect(deepFreeze(true)).toEqual(true);
    expect(deepFreeze(null)).toEqual(null);
    expect(deepFreeze(undefined)).toEqual(undefined);
  });

  it('is a no-op on an already-frozen object', () => {
    const o = Object.freeze({ a: 1 });
    expect(deepFreeze(o)).toBe(o);
    expect(Object.isFrozen(o)).toEqual(true);
  });
});
