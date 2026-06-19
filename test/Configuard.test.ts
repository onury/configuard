// core modules
import { readFileSync } from 'node:fs';

// own modules
import { AccessorType, ListType, ValueType } from '../src/enums/index.js';
import { Configuard, ConfiguardError } from '../src/index.js';
import type { IConfigItem } from '../src/types/index.js';
import { typeOf } from '../src/utils/index.js';

// Raw config rows, as they would be fetched from the `config` DB table.
// These values are the source of truth for the assertions below.
const rawList = JSON.parse(
  readFileSync(new URL('./_data/sys-config.json', import.meta.url), 'utf8')
) as IConfigItem[];

// Builds a minimal, valid `IConfigItem` for focused, inline fixtures.
const item = (over: Partial<IConfigItem> & Pick<IConfigItem, 'key'>): IConfigItem => ({
  accessor: AccessorType.SYSTEM,
  type: ValueType.STRING,
  listType: ListType.NONE,
  value: null,
  editable: true,
  requiresReboot: false,
  encrypt: false,
  ...over
});

// Captures and returns the ConfiguardError thrown by `fn` (fails if none).
const catchError = (fn: () => unknown): ConfiguardError => {
  try {
    fn();
  } catch (e) {
    return e as ConfiguardError;
  }
  throw new Error('Expected the function to throw, but it did not.');
};

describe('Configuard (built from sys-config.json)', () => {
  // Built inside a hook (not at collection time) so Stryker treats these as
  // runtime — not static — mutants.
  let config: Configuard;
  beforeEach(() => {
    config = new Configuard(rawList, { accessor: AccessorType.SYSTEM }, { debugLogs: false });
  });

  const raw = (key: string): IConfigItem | undefined => rawList.find((i) => i.key === key);

  // Asserts that a built value matches the expected value (by value AND type),
  // and that the originating raw item exists with the same accessor.
  const expectCheckItem = (key: string, expectedValue: unknown): void => {
    const value = config.get(key);
    expect(value).toEqual(expectedValue);
    expect(typeOf(value)).toEqual(typeOf(expectedValue));

    const item = raw(key);
    expect(item).not.toEqual(undefined);
    if (item === undefined) return;
    expect(item.accessor).toEqual(config.accessor);
  };

  it('builds a nested object from the raw config list', () => {
    const data = config.data;
    expect(data).toEqual(expect.any(Object));
    expect(data.basePath).toEqual(raw('basePath')?.value);
  });

  it('parses scalar values by their declared type', () => {
    expectCheckItem('basePath', '/base'); // string
    expectCheckItem('device.config.lifeSpan', 1440); // integer
    expectCheckItem('device.config.updateOnBoot', true); // boolean
    expectCheckItem('device.onEvent', 'Action.1'); // string
    expectCheckItem('port', 8081); // number
    expectCheckItem('device.status.lifeSpan', 300); // integer
    expectCheckItem('device.settings.authEnabled', false); // boolean
    expectCheckItem('device.diagnostics.uploadDir', 'device-diagnostics'); // string
    expectCheckItem('device.protocol.pingInterval', 0); // integer
    expectCheckItem('soap.path', '/soap'); // string
    expectCheckItem('verifyClient', false); // boolean
  });

  it('resolves ${...} template references against other values', () => {
    // environment.internalPort = "${port}" -> 8081 (number, parsed as integer)
    expectCheckItem('environment.internalPort', 8081);
  });

  it('treats null-valued items per their type (json/string)', () => {
    expectCheckItem('websocket.ping.data', null); // json + null value -> null
    expectCheckItem('websocket.pong.data', null); // json + null value -> null
    expectCheckItem('device.protocol.setting3', ''); // string + "" value -> ''
  });

  it('joins comma-separated lists (csl) back into a normalized string', () => {
    expectCheckItem('device.ui.colors', 'Blue,Red,Green,Yellow,Black,White');
    expectCheckItem('device.protocol.setting1', 'Opts.First,Opts.Second,Opts.Prop.Third.New');
  });

  it('excludes @-key option-list definitions from the built config', () => {
    expect(config.has('@UIColors')).toEqual(false);
    expect(config.has('@SomeActions')).toEqual(false);
    expect(config.has('@MyOptions')).toEqual(false);
  });
});

describe('Configuard list types', () => {
  let config: Configuard;
  beforeEach(() => {
    config = new Configuard(
      [
        item({
          key: 'arr.nums',
          type: ValueType.INTEGER,
          listType: ListType.ARRAY,
          value: '1, 2, 3'
        }),
        item({ key: 'arr.empty', type: ValueType.STRING, listType: ListType.ARRAY, value: '' }),
        item({
          key: 'csl.tags',
          type: ValueType.STRING,
          listType: ListType.CSL,
          value: 'a , b ,c'
        }),
        item({ key: 'csl.empty', type: ValueType.STRING, listType: ListType.CSL, value: null }),
        // empty csl whose type is NOT string still defaults to "" (csl is a string).
        item({ key: 'csl.intEmpty', type: ValueType.INTEGER, listType: ListType.CSL, value: '' }),
        item({ key: 'str.empty', type: ValueType.STRING, listType: ListType.NONE, value: '' }),
        item({ key: 'json.null', type: ValueType.JSON, listType: ListType.NONE, value: null }),
        item({ key: 'scalar.num', type: ValueType.NUMBER, listType: ListType.NONE, value: '42' })
      ],
      { accessor: AccessorType.SYSTEM }
    );
  });

  it('parses an array listType into an array of typed items', () => {
    expect(config.get('arr.nums')).toEqual([1, 2, 3]);
  });

  it('parses a csl listType into a normalized, comma-joined string', () => {
    expect(config.get('csl.tags')).toEqual('a,b,c');
  });

  it('defaults empty values by listType/type (array -> [], csl/string -> "")', () => {
    expect(config.get('arr.empty')).toEqual([]);
    expect(config.get('csl.empty')).toEqual('');
    expect(config.get('csl.intEmpty')).toEqual('');
    expect(config.get('str.empty')).toEqual('');
  });

  it('keeps a null non-string scalar as null', () => {
    expect(config.get('json.null')).toEqual(null);
  });

  it('parses a none listType scalar by its type', () => {
    expect(config.get('scalar.num')).toEqual(42);
  });
});

describe('Configuard public API', () => {
  let config: Configuard;
  beforeEach(() => {
    config = new Configuard([item({ key: 'a.b', type: ValueType.INTEGER, value: '7' })], {
      accessor: AccessorType.SYSTEM
    });
  });

  it('get() returns typed values and falls back to a default', () => {
    expect(config.get<number>('a.b')).toEqual(7);
    expect(config.get('missing.key')).toBeUndefined();
    expect(config.get('missing.key', 'DEFAULT')).toEqual('DEFAULT');
  });

  it('has() reflects whether a path exists', () => {
    expect(config.has('a.b')).toEqual(true);
    expect(config.has('missing.key')).toEqual(false);
  });

  it('exposes the resolved accessor', () => {
    expect(config.accessor).toEqual(AccessorType.SYSTEM);
  });
});

describe('Configuard accessor access control', () => {
  it('system accessor includes only system/all items', () => {
    const config = new Configuard(
      [
        item({ key: 'sys.only', value: 'x' }),
        {
          ...item({ key: 'app.only', value: 'y' }),
          accessor: AccessorType.APPLICATION,
          appAccess: 2
        }
      ],
      { accessor: AccessorType.SYSTEM }
    );
    expect(config.has('sys.only')).toEqual(true);
    expect(config.has('app.only')).toEqual(false);
  });

  it('application accessor filters items by bitwise appAccess', () => {
    const appList: IConfigItem[] = [
      { ...item({ key: 'a', value: 'x' }), accessor: AccessorType.APPLICATION, appAccess: 0b010 },
      { ...item({ key: 'b', value: 'y' }), accessor: AccessorType.APPLICATION, appAccess: 0b100 }
    ];
    const config = new Configuard(appList, {
      accessor: AccessorType.APPLICATION,
      appAccess: 0b010
    });
    expect(config.has('a')).toEqual(true); // 0b010 & 0b010 -> allowed
    expect(config.has('b')).toEqual(false); // 0b100 & 0b010 -> not allowed
  });

  it('exposes "all" items (without appAccess) to application clients', () => {
    const config = new Configuard(
      [{ ...item({ key: 'shared', value: 'x' }), accessor: AccessorType.ALL }],
      { accessor: AccessorType.APPLICATION, appAccess: 0b001 }
    );
    expect(config.has('shared')).toEqual(true);
  });

  it('throws when an application item is missing its own appAccess', () => {
    const config = () =>
      new Configuard([{ ...item({ key: 'a', value: 'x' }), accessor: AccessorType.APPLICATION }], {
        accessor: AccessorType.APPLICATION,
        appAccess: 0b001
      });
    expect(config).toThrow(/Invalid appAccess/);
  });

  it('throws when accessor is "all"', () => {
    expect(() => new Configuard([], { accessor: AccessorType.ALL })).toThrow(/Cannot set accessor/);
  });

  it('defaults to "application" and throws (with prefix) when no accessor info is given', () => {
    // No accessorInfo at all: accessor defaults to "application", which then
    // requires an appLevel -> throws.
    expect(() => new Configuard([])).toThrow(/Invalid appLevel/);
  });

  it('throws when application accessor has no appLevel', () => {
    expect(() => new Configuard([], { accessor: AccessorType.APPLICATION })).toThrow(
      /Invalid appLevel/
    );
  });
});

describe('Configuard.isConfigItem', () => {
  it('accepts a well-formed config item', () => {
    expect(Configuard.isConfigItem(item({ key: 'x' }))).toEqual(true);
  });

  it('rejects items with an invalid type/listType/accessor', () => {
    expect(
      Configuard.isConfigItem({ accessor: 'system', key: 'x', type: 'nope', listType: 'none' })
    ).toEqual(false);
  });

  it('rejects non-objects', () => {
    expect(Configuard.isConfigItem(5)).toEqual(false);
    expect(Configuard.isConfigItem(null)).toEqual(false);
  });
});

describe('Configuard.parseFlat', () => {
  let flat: ReturnType<typeof Configuard.parseFlat>;
  beforeEach(() => {
    flat = Configuard.parseFlat([
      item({ key: '@UIColors', listType: ListType.CSL, value: 'Blue,Red,Green' }),
      // value is always treated as CSL for @-keys, regardless of listType.
      item({ key: '@Actions', listType: ListType.ARRAY, value: 'Start,\nStop,\nReset' }),
      item({ key: '@InternalPorts', type: ValueType.INTEGER, value: '8000,8080,8081,9000' }),
      item({
        key: 'device.ui.colors',
        listType: ListType.CSL,
        value: 'Blue,Red',
        options: '${@UIColors}'
      }),
      item({ key: 'device.onEvent', value: 'Start', options: '${@Actions}' }),
      item({ key: 'device.name', value: 'edge-01' }),
      item({ key: 'port', type: ValueType.INTEGER, value: '8081', options: '${@InternalPorts}' }),
      item({ key: 'environment.internalPort', type: ValueType.INTEGER, value: '${port}' })
    ]);
  });

  it('collects @-key option lists into the `@` object (trimmed, uncast strings)', () => {
    expect(flat['@']).toEqual({
      UIColors: ['Blue', 'Red', 'Green'],
      Actions: ['Start', 'Stop', 'Reset'], // newlines around separators normalized
      InternalPorts: ['8000', '8080', '8081', '9000'] // not cast to numbers
    });
  });

  it('resolves ${...} value templates as strings (no type casting)', () => {
    const get = (key: string) => flat.configList.find((i) => i.key === key);
    expect(get('environment.internalPort')?.value).toEqual('8081'); // ${port}
    expect(get('port')?.value).toEqual('8081'); // stays a string
    expect(get('device.name')?.value).toEqual('edge-01');
  });

  it('expands each item`s options reference into a string array', () => {
    const get = (key: string) => flat.configList.find((i) => i.key === key);
    expect(get('device.ui.colors')?.options).toEqual(['Blue', 'Red', 'Green']);
    expect(get('device.onEvent')?.options).toEqual(['Start', 'Stop', 'Reset']);
    expect(get('port')?.options).toEqual(['8000', '8080', '8081', '9000']);
    expect(get('device.name')?.options).toEqual(null);
  });

  it('keeps @-key items in configList, normalizing their listType to csl', () => {
    const opt = flat.configList.find((i) => i.key === '@Actions');
    expect(opt?.listType).toEqual(ListType.CSL);
    expect(opt?.value).toEqual('Start,\nStop,\nReset'); // value left untouched
  });

  it('throws when a value is not a member of its option list', () => {
    expect(() =>
      Configuard.parseFlat([
        item({ key: '@Colors', listType: ListType.CSL, value: 'Blue,Red' }),
        item({ key: 'x', value: 'Green', options: '${@Colors}' })
      ])
    ).toThrow(/not in its option list/);
  });

  it('throws when an options reference points to a missing option list', () => {
    expect(() =>
      Configuard.parseFlat([item({ key: 'x', value: 'a', options: '${@Missing}' })])
    ).toThrow(/option list is missing/);
  });

  it('expands an inline (literal csl) options list and validates against it', () => {
    const out = Configuard.parseFlat([
      item({ key: 'x', value: 'a', listType: ListType.NONE, options: 'a, b, c' })
    ]);
    expect(out.configList[0].options).toEqual(['a', 'b', 'c']);
    // and an out-of-list value against an inline list still throws
    expect(() => Configuard.parseFlat([item({ key: 'x', value: 'z', options: 'a,b,c' })])).toThrow(
      /not in its option list/
    );
  });

  it('resolves a value that references an already-built value', () => {
    const out = Configuard.parseFlat([
      item({ key: 'base', value: 'root' }),
      item({ key: 'child', value: '${base}/leaf' })
    ]);
    const get = (key: string) => out.configList.find((i) => i.key === key);
    expect(get('child')?.value).toEqual('root/leaf');
  });

  it('throws on circular value templates', () => {
    expect(() =>
      Configuard.parseFlat([item({ key: 'a', value: '${b}' }), item({ key: 'b', value: '${a}' })])
    ).toThrow(/Circular template reference/);
  });

  it('throws on a missing value template reference', () => {
    expect(() => Configuard.parseFlat([item({ key: 'a', value: '${nope}' })])).toThrow(
      /Referenced value for template is missing/
    );
  });

  it('returns an empty result for a non-array input', () => {
    expect(Configuard.parseFlat(undefined as unknown as IConfigItem[])).toEqual({
      '@': {},
      configList: []
    });
  });

  it('handles an @-key with an empty value (empty option list)', () => {
    const out = Configuard.parseFlat([item({ key: '@Empty', value: '' })]);
    expect(out['@'].Empty).toEqual([]);
  });

  it('allows an empty value for a none-listType item that declares options', () => {
    const out = Configuard.parseFlat([
      item({ key: '@C', listType: ListType.CSL, value: 'a,b' }),
      item({ key: 'x', listType: ListType.NONE, value: '', options: '${@C}' })
    ]);
    expect(out.configList.find((i) => i.key === 'x')?.value).toEqual('');
  });

  it('keeps a null value as null', () => {
    const out = Configuard.parseFlat([item({ key: 'x', value: null })]);
    expect(out.configList[0].value).toEqual(null);
  });

  it('produces the exact flat structure (deep equality)', () => {
    const out = Configuard.parseFlat([
      item({ key: '@Colors', listType: ListType.CSL, value: 'Blue, Red' }),
      item({ key: 'ui.color', listType: ListType.NONE, value: 'Blue', options: '${@Colors}' }),
      item({ key: 'host', value: 'h' }),
      item({ key: 'url', value: '${host}:80' })
    ]);
    expect(out).toEqual({
      '@': { Colors: ['Blue', 'Red'] },
      configList: [
        { ...item({ key: '@Colors', listType: ListType.CSL, value: 'Blue, Red' }), options: null },
        {
          ...item({ key: 'ui.color', listType: ListType.NONE, value: 'Blue' }),
          options: ['Blue', 'Red']
        },
        { ...item({ key: 'host', value: 'h' }), options: null },
        { ...item({ key: 'url', value: 'h:80' }), options: null }
      ]
    });
  });

  it('resolves a reference to a null value as an empty string', () => {
    const out = Configuard.parseFlat([
      item({ key: 'a', value: '${b}' }),
      item({ key: 'b', value: null })
    ]);
    expect(out.configList.find((i) => i.key === 'a')?.value).toEqual('');
  });
});

describe('Configuard misc branches', () => {
  it('defaults accessor to "application" when none is provided', () => {
    // No accessor given, but an appLevel is → behaves as an application client.
    const config = new Configuard(
      [{ ...item({ key: 'x', value: 'v' }), accessor: AccessorType.ALL }],
      {
        appAccess: 0b001
      }
    );
    expect(config.accessor).toEqual(AccessorType.APPLICATION);
    expect(config.get('x')).toEqual('v');
  });

  it('handles an empty config list', () => {
    const config = new Configuard([], { accessor: AccessorType.SYSTEM });
    expect(config.data).toEqual({});
  });

  it('throws on entries that are not valid config items (e.g. bad type)', () => {
    expect(
      () =>
        new Configuard(
          [{ ...item({ key: 'bad', value: 'v' }), type: 'bogus' as unknown as ValueType }],
          { accessor: AccessorType.SYSTEM }
        )
    ).toThrow(/Corrupt config item "bad"/);
  });

  it('keeps the first item when a key is duplicated (value + metadata)', () => {
    const config = new Configuard(
      [
        item({ key: 'dup', value: 'first', encrypt: false }),
        item({ key: 'dup', value: 'second', encrypt: true })
      ],
      { accessor: AccessorType.SYSTEM }
    );
    expect(config.get('dup')).toEqual('first');
    // metadata also reflects the first occurrence, not the last.
    expect(config.isEncrypted('dup')).toEqual(false);
  });

  it('skips $-section markers', () => {
    const config = new Configuard(
      [
        item({ key: 'real', value: 'v' }),
        item({ key: 'cp.config.$title', value: 'Config' }) // section marker
      ],
      { accessor: AccessorType.SYSTEM }
    );
    expect(config.get('real')).toEqual('v');
    expect(config.has('cp.config.$title')).toEqual(false);
  });

  it('throws on an item with a non-string key', () => {
    expect(
      () =>
        new Configuard([{ ...item({ key: 123 as unknown as string, value: 'x' }) }], {
          accessor: AccessorType.SYSTEM
        })
    ).toThrow(/"key" must be a string/);
  });
});

describe('ConfiguardError.key propagation', () => {
  const sys = { accessor: AccessorType.SYSTEM };

  it('sets `key` on a NaN value error', () => {
    const err = catchError(
      () => new Configuard([item({ key: 'nan', type: ValueType.NUMBER, value: 'abc' })], sys)
    );
    expect(err.key).toEqual('nan');
  });

  it('sets `key` on a circular template error (build)', () => {
    const err = catchError(
      () =>
        new Configuard([item({ key: 'a', value: '${b}' }), item({ key: 'b', value: '${a}' })], sys)
    );
    expect(err.key).toEqual('a');
  });

  it('sets `key` on a missing template error (build)', () => {
    const err = catchError(() => new Configuard([item({ key: 'orphan', value: '${nope}' })], sys));
    expect(err.key).toEqual('orphan');
  });

  it('sets `key` on an appAccess error', () => {
    const err = catchError(
      () =>
        new Configuard(
          [{ ...item({ key: 'a', value: 'x' }), accessor: AccessorType.APPLICATION }],
          {
            accessor: AccessorType.APPLICATION,
            appAccess: 0b001
          }
        )
    );
    expect(err.key).toEqual('a');
  });

  it('sets `key` on parseFlat circular / missing / option-list errors', () => {
    expect(
      catchError(() =>
        Configuard.parseFlat([item({ key: 'a', value: '${b}' }), item({ key: 'b', value: '${a}' })])
      ).key
    ).toEqual('a');
    expect(
      catchError(() => Configuard.parseFlat([item({ key: 'a', value: '${nope}' })])).key
    ).toEqual('a');
    expect(
      catchError(() =>
        Configuard.parseFlat([item({ key: 'x', value: 'a', options: '${@Missing}' })])
      ).key
    ).toEqual('x');
    expect(
      catchError(() =>
        Configuard.parseFlat([
          item({ key: '@C', listType: ListType.CSL, value: 'a,b' }),
          item({ key: 'x', value: 'z', options: '${@C}' })
        ])
      ).key
    ).toEqual('x');
  });
});

describe('Configuard metadata accessors', () => {
  let config: Configuard;
  beforeEach(() => {
    config = new Configuard(
      [
        item({ key: 'secret', value: 'x', encrypt: true, requiresReboot: true }),
        item({ key: 'plain', value: 'y', encrypt: false, requiresReboot: false }),
        // an application-only item: filtered out for a SYSTEM accessor.
        {
          ...item({ key: 'appOnly', value: 'z' }),
          accessor: AccessorType.APPLICATION,
          appAccess: 2
        }
      ],
      { accessor: AccessorType.SYSTEM }
    );
  });

  it('getMeta() returns a frozen, read-only view of a visible item', () => {
    const meta = config.getMeta('secret');
    expect(meta?.type).toEqual(ValueType.STRING);
    expect(meta?.encrypt).toEqual(true);
    expect(meta?.requiresReboot).toEqual(true);
    expect(Object.isFrozen(meta)).toEqual(true);
  });

  it('getMeta() returns undefined for unknown or non-visible keys', () => {
    expect(config.getMeta('missing')).toBeUndefined();
    expect(config.getMeta('appOnly')).toBeUndefined(); // ABAC-filtered
  });

  it('isEncrypted() reflects the item flag (false for unknown/non-visible)', () => {
    expect(config.isEncrypted('secret')).toEqual(true);
    expect(config.isEncrypted('plain')).toEqual(false);
    expect(config.isEncrypted('missing')).toEqual(false);
    expect(config.isEncrypted('appOnly')).toEqual(false);
  });

  it('requiresReboot() reflects the item flag (false for unknown/non-visible)', () => {
    expect(config.requiresReboot('secret')).toEqual(true);
    expect(config.requiresReboot('plain')).toEqual(false);
    expect(config.requiresReboot('missing')).toEqual(false);
  });
});

describe('Configuard decryption', () => {
  const sys = { accessor: AccessorType.SYSTEM };
  const strip = (v: string): string => v.replace(/^enc:/, '');

  it('decrypts encrypt:true values via the hook before parsing', () => {
    const decrypt = vi.fn(strip);
    const config = new Configuard(
      [
        item({ key: 'secret', value: 'enc:hunter2', encrypt: true }),
        item({ key: 'plain', value: 'visible', encrypt: false })
      ],
      sys,
      { decrypt }
    );
    expect(config.get('secret')).toEqual('hunter2');
    expect(config.get('plain')).toEqual('visible');
    // hook is called only for encrypt:true items, with the item passed through.
    expect(decrypt).toHaveBeenCalledTimes(1);
    expect(decrypt).toHaveBeenCalledWith('enc:hunter2', expect.objectContaining({ key: 'secret' }));
  });

  it('uses the value as-is when no decrypt hook is provided', () => {
    const config = new Configuard([item({ key: 'secret', value: 'enc:x', encrypt: true })], sys);
    expect(config.get('secret')).toEqual('enc:x');
  });

  it('warns (debugLogs) when an encrypted item has no decrypt hook', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      new Configuard([item({ key: 'secret', value: 'enc:x', encrypt: true })], sys, {
        debugLogs: true
      });
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('skips decryption for empty/null encrypted values', () => {
    const decrypt = vi.fn(strip);
    const config = new Configuard([item({ key: 'empty', value: '', encrypt: true })], sys, {
      decrypt
    });
    expect(config.get('empty')).toEqual('');
    expect(decrypt).not.toHaveBeenCalled();
  });

  it('throws a ConfiguardError when the decrypt hook fails', () => {
    const decrypt = (): string => {
      throw new Error('bad key');
    };
    const err = catchError(
      () =>
        new Configuard([item({ key: 'secret', value: 'enc:x', encrypt: true })], sys, { decrypt })
    );
    expect(err).toBeInstanceOf(ConfiguardError);
    expect(err.key).toEqual('secret');
    expect(err.message).toMatch(/Failed to decrypt value of key "secret"/);
    expect(err.cause).toBeInstanceOf(Error);
  });

  it('decrypts a referenced encrypted item once, before templating', () => {
    const decrypt = vi.fn(strip);
    const config = new Configuard(
      [
        item({ key: 'url', value: 'https://${host}', encrypt: false }),
        item({ key: 'host', value: 'enc:example.com', encrypt: true })
      ],
      sys,
      { decrypt }
    );
    expect(config.get('host')).toEqual('example.com');
    expect(config.get('url')).toEqual('https://example.com');
    expect(decrypt).toHaveBeenCalledTimes(1); // memoized: decrypted once
  });
});

describe('Configuard lock (immutability)', () => {
  const rows: IConfigItem[] = [
    item({ key: 'a.b.c', value: 'deep' }),
    item({ key: 'list', type: ValueType.INTEGER, listType: ListType.ARRAY, value: '1, 2, 3' })
  ];

  it('deep-freezes the built object by default (isLocked === true)', () => {
    const config = new Configuard(rows, { accessor: AccessorType.SYSTEM });
    expect(config.isLocked).toEqual(true);
    expect(Object.isFrozen(config.data)).toEqual(true);
    // nested object and array are frozen too (deep).
    expect(Object.isFrozen((config.data.a as { b: unknown }).b)).toEqual(true);
    expect(Object.isFrozen(config.data.list)).toEqual(true);
  });

  it('prevents mutation of a locked object (value stays unchanged)', () => {
    const config = new Configuard(rows, { accessor: AccessorType.SYSTEM });
    // In strict/ESM mode, writing to a frozen object throws.
    expect(() => {
      (config.data as Record<string, unknown>).injected = 'x';
    }).toThrow();
    expect(() => {
      (config.data.list as number[]).push(4);
    }).toThrow();
    expect(config.has('injected')).toEqual(false);
    expect(config.get('list')).toEqual([1, 2, 3]);
  });

  it('freezes even an empty built object', () => {
    const config = new Configuard([], { accessor: AccessorType.SYSTEM });
    expect(config.isLocked).toEqual(true);
    expect(Object.isFrozen(config.data)).toEqual(true);
  });

  it('leaves the object mutable when lock: false', () => {
    const config = new Configuard(rows, { accessor: AccessorType.SYSTEM }, { lock: false });
    expect(config.isLocked).toEqual(false);
    expect(Object.isFrozen(config.data)).toEqual(false);
    (config.data as Record<string, unknown>).injected = 'x';
    expect(config.get('injected')).toEqual('x');
  });

  it('keeps get()/has() working on a locked object', () => {
    const config = new Configuard(rows, { accessor: AccessorType.SYSTEM });
    expect(config.get('a.b.c')).toEqual('deep');
    expect(config.has('list')).toEqual(true);
    expect(config.has('missing')).toEqual(false);
  });
});

describe('Configuard build() edge cases & logging', () => {
  it('allows an `any`-typed value that auto-parses to undefined (not set)', () => {
    // The literal string 'undefined' under the `any` type legitimately parses
    // to `undefined`; the item is simply not set (this is not corruption).
    const config = new Configuard(
      [
        item({ key: 'gone', type: ValueType.ANY, value: 'undefined' }),
        item({ key: 'ok', value: 'fine' })
      ],
      { accessor: AccessorType.SYSTEM }
    );
    expect(config.has('gone')).toEqual(false);
    expect(config.get('ok')).toEqual('fine');
  });

  it('silently tolerates a "looks incorrect" value when debugLogs is off', () => {
    // Same as the warning test below, but with debugLogs off (the default): the
    // value still resolves to "undefined" without logging or throwing.
    const config = new Configuard(
      [
        item({ key: 'gone', type: ValueType.ANY, value: 'undefined' }),
        item({ key: 'tmpl', value: '${gone}' })
      ],
      { accessor: AccessorType.SYSTEM }
    );
    expect(config.get('tmpl')).toEqual('undefined');
  });

  it('trims surrounding whitespace from an item key', () => {
    const config = new Configuard([item({ key: '  spaced.key  ', value: 'v' })], {
      accessor: AccessorType.SYSTEM
    });
    expect(config.get('spaced.key')).toEqual('v');
  });

  it('treats a non-array raw config as empty (no throw)', () => {
    const config = new Configuard(undefined as unknown as IConfigItem[], {
      accessor: AccessorType.SYSTEM
    });
    expect(config.data).toEqual({});
    expect(config.isLocked).toEqual(true);
  });

  it('throws when a value resolves to NaN for a numeric type', () => {
    expect(
      () =>
        new Configuard([item({ key: 'nan', type: ValueType.NUMBER, value: 'abc' })], {
          accessor: AccessorType.SYSTEM
        })
    ).toThrow(/Value "abc" of key "nan" is not a valid number/);
  });

  it('throws when a value cannot be parsed to its declared type', () => {
    // Each unparseable value names its offending key in the thrown message.
    const cases: Array<[ValueType, string]> = [
      [ValueType.JSON, '{bad'],
      [ValueType.HEXADECIMAL, 'xyz'],
      [ValueType.TIME, '90:77'],
      [ValueType.DATE, 'not-a-date']
    ];
    for (const [type, value] of cases) {
      expect(
        () => new Configuard([item({ key: 'k', type, value })], { accessor: AccessorType.SYSTEM })
      ).toThrow(/Failed to parse value ".*" of key "k"\./);
    }
  });

  it('throws a ConfiguardError that carries the key and original `cause`', () => {
    let caught: ConfiguardError | undefined;
    try {
      new Configuard([item({ key: 'k', type: ValueType.JSON, value: '{bad' })], {
        accessor: AccessorType.SYSTEM
      });
    } catch (error) {
      caught = error as ConfiguardError;
    }
    expect(caught).toBeInstanceOf(ConfiguardError);
    expect(caught?.name).toEqual('ConfiguardError');
    expect(caught?.key).toEqual('k');
    expect(caught?.cause).toBeInstanceOf(Error);
  });

  it('resolves forward template references regardless of declaration order', () => {
    // `a` references `b`, but is declared first (forces recursive resolution).
    const config = new Configuard(
      [item({ key: 'a', value: '${b}-x' }), item({ key: 'b', value: '2' })],
      { accessor: AccessorType.SYSTEM }
    );
    expect(config.get('a')).toEqual('2-x');
    expect(config.get('b')).toEqual('2');
  });

  it('resolves a template reference to an already-built value', () => {
    // `dep` is declared first, so when `use` is processed the value already
    // exists in the result object (no recursion needed).
    const config = new Configuard(
      [item({ key: 'dep', value: 'host' }), item({ key: 'use', value: '${dep}:8080' })],
      { accessor: AccessorType.SYSTEM }
    );
    expect(config.get('use')).toEqual('host:8080');
  });

  it('throws on a missing template reference', () => {
    expect(
      () =>
        new Configuard([item({ key: 'orphan', value: '${nope}' })], {
          accessor: AccessorType.SYSTEM
        })
    ).toThrow(/Referenced value for template is missing: "\$\{nope\}"/);
  });

  it('throws on circular template references', () => {
    expect(
      () =>
        new Configuard([item({ key: 'a', value: '${b}' }), item({ key: 'b', value: '${a}' })], {
          accessor: AccessorType.SYSTEM
        })
    ).toThrow(/Circular template reference detected at: "a"/);
  });

  it('emits a "looks incorrect" console warning when debugLogs is enabled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // `gone` (any, 'undefined') legitimately resolves to undefined and is not
      // set; `tmpl` references it, collapsing to the string "undefined" — a
      // valid-but-suspicious value that triggers the lenient warning.
      const config = new Configuard(
        [
          item({ key: 'gone', type: ValueType.ANY, value: 'undefined' }),
          item({ key: 'tmpl', value: '${gone}' })
        ],
        { accessor: AccessorType.SYSTEM },
        { debugLogs: true }
      );
      expect(config.get('tmpl')).toEqual('undefined');
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('Configuard.serializeFlat', () => {
  // A representative original list (the DB source of truth).
  const list: IConfigItem[] = [
    { ...item({ key: 'name', value: 'Acme' }), id: 1 },
    item({ key: 'port', type: ValueType.INTEGER, value: '8080', requiresReboot: true }),
    item({ key: 'flag', type: ValueType.BOOLEAN, value: 'false' }),
    item({ key: 'tags', type: ValueType.STRING, listType: ListType.CSL, value: 'a,b' }),
    item({ key: 'nums', type: ValueType.INTEGER, listType: ListType.ARRAY, value: '1,2' }),
    item({ key: 'locked', value: 'fixed', editable: false }),
    item({ key: '@Colors', listType: ListType.CSL, value: 'Blue,Red,Green' }),
    item({ key: 'color', value: 'Blue', options: '${@Colors}' }),
    item({ key: 'size', value: 's', options: 's, m, l' }),
    item({ key: 'blank' }), // value defaults to null
    { ...item({ key: 'pwd', value: 'cipher', encrypt: true }), id: 9 }
  ];

  it('returns only changed rows as a diff (default diffOnly)', () => {
    const out = Configuard.serializeFlat(list, { name: { value: 'NewCo' } });
    expect(out.updates).toEqual([{ key: 'name', id: 1, value: 'NewCo', requiresReboot: false }]);
    expect(out.requiresReboot).toEqual(false);
    expect(out.rows).toBeUndefined();
  });

  it('omits a row whose value did not change', () => {
    const out = Configuard.serializeFlat(list, { name: { value: 'Acme' } });
    expect(out.updates).toEqual([]);
  });

  it('canonicalizes numbers and booleans, trims strings', () => {
    const out = Configuard.serializeFlat(list, {
      port: { value: ' 9090 ' },
      flag: { value: '1' },
      name: { value: '  Spaced  ' }
    });
    const byKey = Object.fromEntries(out.updates.map((u) => [u.key, u.value]));
    expect(byKey.port).toEqual('9090');
    expect(byKey.flag).toEqual('true');
    expect(byKey.name).toEqual('Spaced');
  });

  it('normalizes csl and array values (comma-joined)', () => {
    const out = Configuard.serializeFlat(list, {
      tags: { value: 'x , y ,z' },
      nums: { value: '3, 4, 5' }
    });
    const byKey = Object.fromEntries(out.updates.map((u) => [u.key, u.value]));
    expect(byKey.tags).toEqual('x,y,z');
    expect(byKey.nums).toEqual('3,4,5');
  });

  it('serializes empty values (none -> null, list -> "")', () => {
    const out = Configuard.serializeFlat(list, {
      name: { value: '' },
      tags: { value: '' }
    });
    const byKey = Object.fromEntries(out.updates.map((u) => [u.key, u.value]));
    expect(byKey.name).toEqual(null);
    expect(byKey.tags).toEqual('');
  });

  it('throws on an invalid value for the declared type', () => {
    const err = catchError(() => Configuard.serializeFlat(list, { port: { value: 'abc' } }));
    expect(err).toBeInstanceOf(ConfiguardError);
    expect(err.key).toEqual('port');
  });

  it('validates against a referenced option list', () => {
    expect(Configuard.serializeFlat(list, { color: { value: 'Red' } }).updates[0].value).toEqual(
      'Red'
    );
    expect(
      catchError(() => Configuard.serializeFlat(list, { color: { value: 'Pink' } })).key
    ).toEqual('color');
  });

  it('validates against an inline (csl) option list', () => {
    expect(Configuard.serializeFlat(list, { size: { value: 'm' } }).updates[0].value).toEqual('m');
    expect(() => Configuard.serializeFlat(list, { size: { value: 'xl' } })).toThrow(
      /not in its option list/
    );
  });

  it('throws when a referenced option list is missing', () => {
    const bad = [item({ key: 'x', value: 'a', options: '${@Nope}' })];
    expect(() => Configuard.serializeFlat(bad, { x: { value: 'a' } })).toThrow(
      /option list is missing/
    );
  });

  it('throws when the key is not found', () => {
    const err = catchError(() => Configuard.serializeFlat(list, { ghost: { value: 'x' } }));
    expect(err.key).toEqual('ghost');
    expect(err.message).toMatch(/No config item found for key "ghost"/);
  });

  it('throws when changing a non-editable item value', () => {
    const err = catchError(() => Configuard.serializeFlat(list, { locked: { value: 'changed' } }));
    expect(err.key).toEqual('locked');
    expect(err.message).toMatch(/not editable/);
  });

  it('allows a metadata-only edit on a non-editable item', () => {
    const out = Configuard.serializeFlat(list, { locked: { editable: true } }, { diffOnly: false });
    expect(out.updates).toEqual([
      { key: 'locked', id: null, value: 'fixed', requiresReboot: false }
    ]);
    expect(out.rows?.[0].editable).toEqual(true);
  });

  it('aggregates requiresReboot across changed rows', () => {
    expect(Configuard.serializeFlat(list, { port: { value: '9000' } }).requiresReboot).toEqual(
      true
    );
    expect(Configuard.serializeFlat(list, { name: { value: 'X' } }).requiresReboot).toEqual(false);
  });

  it('returns full merged rows when diffOnly is false', () => {
    const out = Configuard.serializeFlat(list, { name: { value: 'NewCo' } }, { diffOnly: false });
    expect(out.rows).toHaveLength(1);
    expect(out.rows?.[0]).toMatchObject({ key: 'name', id: 1, value: 'NewCo' });
  });

  it('sets update id to null when the source row has no id', () => {
    expect(Configuard.serializeFlat(list, { port: { value: '9000' } }).updates[0].id).toEqual(null);
  });

  it('encrypts an edited encrypt:true value via the hook', () => {
    const encrypt = vi.fn((v: string) => `enc:${v}`);
    const out = Configuard.serializeFlat(list, { pwd: { value: 'newsecret' } }, { encrypt });
    expect(out.updates[0].value).toEqual('enc:newsecret');
    expect(encrypt).toHaveBeenCalledWith('newsecret', expect.objectContaining({ key: 'pwd' }));
  });

  it('stores the plaintext when an encrypted item is edited without an encrypt hook', () => {
    const out = Configuard.serializeFlat(list, { pwd: { value: 'newsecret' } });
    expect(out.updates[0].value).toEqual('newsecret');
  });

  it('does not call the encrypt hook for an empty encrypted value', () => {
    const encrypt = vi.fn((v: string) => `enc:${v}`);
    const out = Configuard.serializeFlat(list, { pwd: { value: '' } }, { encrypt });
    expect(out.updates[0].value).toEqual(null);
    expect(encrypt).not.toHaveBeenCalled();
  });

  it('throws a ConfiguardError when the encrypt hook fails', () => {
    const encrypt = (): string => {
      throw new Error('kms down');
    };
    const err = catchError(() =>
      Configuard.serializeFlat(list, { pwd: { value: 'x' } }, { encrypt })
    );
    expect(err.key).toEqual('pwd');
    expect(err.message).toMatch(/Failed to encrypt value of key "pwd"/);
    expect(err.cause).toBeInstanceOf(Error);
  });

  it('emits nothing for an empty (no-op) edit', () => {
    expect(Configuard.serializeFlat(list, { name: {} }).updates).toEqual([]);
  });

  it('does not throw when a non-editable item is "edited" to the same value', () => {
    expect(Configuard.serializeFlat(list, { locked: { value: 'fixed' } }).updates).toEqual([]);
  });

  it('emits nothing when a metadata edit matches the current value', () => {
    // `name.editable` is already true; setting it to true again is a no-op.
    expect(Configuard.serializeFlat(list, { name: { editable: true } }).updates).toEqual([]);
  });

  it('keeps a none-type value verbatim (not split on commas)', () => {
    expect(Configuard.serializeFlat(list, { name: { value: 'a,b' } }).updates[0].value).toEqual(
      'a,b'
    );
  });

  it('trims a none value before validating it against its option list', () => {
    expect(Configuard.serializeFlat(list, { color: { value: ' Red ' } }).updates[0].value).toEqual(
      'Red'
    );
  });

  it('serializes an item whose original value was null', () => {
    const out = Configuard.serializeFlat(list, { blank: { value: 'now' } });
    expect(out.updates).toEqual([{ key: 'blank', id: null, value: 'now', requiresReboot: false }]);
  });

  it('handles a non-array config list and empty edits', () => {
    expect(Configuard.serializeFlat(undefined as unknown as IConfigItem[], {})).toEqual({
      updates: [],
      requiresReboot: false
    });
  });
});
