import { ConfGuardError } from '../src/index.js';

describe('ConfGuardError', () => {
  it('is an Error with the ConfGuardError name', () => {
    const err = new ConfGuardError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConfGuardError);
    expect(err.name).toEqual('ConfGuardError');
    expect(err.message).toEqual('boom');
  });

  it('defaults to an empty message', () => {
    expect(new ConfGuardError().message).toEqual('');
  });

  it('carries an optional `key`', () => {
    expect(new ConfGuardError('x', { key: 'a.b' }).key).toEqual('a.b');
    expect(new ConfGuardError('x').key).toBeUndefined();
  });

  it('preserves an optional `cause`', () => {
    const cause = new Error('root');
    expect(new ConfGuardError('x', { cause }).cause).toBe(cause);
    expect(new ConfGuardError('x').cause).toBeUndefined();
  });

  it('can be caught by type via instanceof', () => {
    try {
      throw new ConfGuardError('typed');
    } catch (e) {
      expect(e instanceof ConfGuardError).toEqual(true);
    }
  });
});
