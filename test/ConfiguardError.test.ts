import { ConfiguardError } from '../src/index.js';

describe('ConfiguardError', () => {
  it('is an Error with the ConfiguardError name', () => {
    const err = new ConfiguardError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConfiguardError);
    expect(err.name).toEqual('ConfiguardError');
    expect(err.message).toEqual('boom');
  });

  it('defaults to an empty message', () => {
    expect(new ConfiguardError().message).toEqual('');
  });

  it('carries an optional `key`', () => {
    expect(new ConfiguardError('x', { key: 'a.b' }).key).toEqual('a.b');
    expect(new ConfiguardError('x').key).toBeUndefined();
  });

  it('preserves an optional `cause`', () => {
    const cause = new Error('root');
    expect(new ConfiguardError('x', { cause }).cause).toBe(cause);
    expect(new ConfiguardError('x').cause).toBeUndefined();
  });

  it('can be caught by type via instanceof', () => {
    try {
      throw new ConfiguardError('typed');
    } catch (e) {
      expect(e instanceof ConfiguardError).toEqual(true);
    }
  });
});
