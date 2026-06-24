<h1 align="center">
  <a href="https://onury.io/configuard"><img alt="Configuard" src="https://github.com/onury/configuard/raw/main/configuard-logo.svg" width="320" /></a>
</h1>

<p align="center">
  <a href="https://github.com/onury/configuard/actions/workflows/ci.yml"><img src="https://github.com/onury/configuard/actions/workflows/ci.yml/badge.svg" alt="build" /></a>
  <a href="#quality"><img src="https://img.shields.io/badge/coverage-100%25-2BB150?logo=vitest&logoColor=%23FDC72B&style=flat" alt="coverage" /></a>
  <a href="https://stryker-mutator.io/docs/"><img src="https://img.shields.io/badge/mutation-91%25-2BB150?style=flat" alt="mutation score" /></a>
  <a href="https://www.npmjs.com/package/configuard"><img src="https://img.shields.io/npm/v/configuard.svg?style=flat&label=&color=%23C6234B&logo=npm" alt="version" /></a>
  <a href="https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7"><img src="https://img.shields.io/badge/ESM-F7DF1E?style=flat" alt="ESM" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TS-3260C7?style=flat" alt="TS" /></a>
  <a href="https://github.com/onury/configuard/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/configuard.svg?style=flat&color=blue" alt="license" /></a>
  <a href="https://onury.io/configuard"><img src="https://img.shields.io/badge/docs-read-c27cf4?style=flat" alt="documentation" /></a>
</p>

> This module is **ESM** 🔆. Please [**read this**](https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7).

Builds a **nested, typed** configuration object from a **flat list** of
configuration items (typically rows from a `config` database table) — with
`${...}` value **templating**, reusable **option lists**, and accessor-based
(**ABAC**) filtering. Built on
[`notation`](https://github.com/onury/notation).

```ts
import { Configuard, AccessorType } from 'configuard';

const rows = [
  { accessor: 'system', key: 'company.name', type: 'string', listType: 'none', value: 'Acme', editable: true, requiresReboot: false, encrypt: false },
  { accessor: 'system', key: 'ai.vision.provider', type: 'string', listType: 'none', value: 'gemini', editable: true, requiresReboot: false, encrypt: false }
];

const cfg = new Configuard(rows, { accessor: AccessorType.SYSTEM });

cfg.data;                              // { company: { name: 'Acme' }, ai: { vision: { provider: 'gemini' } } }
cfg.get<string>('ai.vision.provider'); // 'gemini'  (a scalar, not ['gemini'])
cfg.has('company.name');               // true
```

## Why?

**Why a vertical key → value config table?** Configuration is a long,
ever-growing list of individual settings that changes across environments and
over the life of a product. A tall key/value table lets you add, edit, or remove
one setting at a time — each row carrying its own metadata (`type`, access
level, options, `requiresReboot`, `editable`, …) — and administer it all from a
UI **without schema migrations**. That's far more maintainable than wide,
one-column-per-setting tables or settings scattered across files.

But flat rows are great to *store and administer*, not to *consume*: values are
strings, related keys are scattered, and the same value is often duplicated.
Configuard sits across the whole lifecycle:

1. **Store** — keep your settings as `IConfigItem` rows in one `config` table.
2. **Build & use safely** — `new Configuard(rows)` produces a **nested,
   type-cast**, ABAC-filtered object for your runtime. It is **frozen by
   default** (immutable), so backend code can't accidentally mutate live config.
   Read it via `.data` / `.get()` / `.has()`.
3. **Edit in a UI** — `Configuard.parseFlat()` returns the **same flat list**
   with templates resolved and option lists expanded — ideal for an
   **admin/editor UI** where each row is a form field with its own allowed values.
4. **Save back** — `Configuard.serializeFlat()` validates the admin's edits,
   serializes them to DB strings (optionally re-encrypting), and returns the
   **diff** of changed rows to persist to the `config` table.

Configuard also **fails loud**: a corrupt config row throws immediately at
construction rather than silently producing a partial object (see
[Validation](#validation--fail-loud)).

## Install

```sh
npm i configuard
```

`notation` is a runtime dependency and is installed automatically.

## How it Works

- **Flat → nested + typed.** Each item's `key` is a dot/bracket notation
  (`ai.vision.provider`); its string `value` is parsed according to `type`
  (see [Value types](#value-types)) and assembled into a nested object via
  `notation`.
- **Scalar by default.** A value is parsed to its declared type — `"gemini"`
  stays the string `"gemini"`. Lists are opt-in via `listType` (see
  [List types](#list-types)).
- **Templating.** Values may reference other keys: `"${files.content}/img"` or
  `"${port}"`. References are resolved recursively; **circular references are
  detected** (no infinite recursion) and missing references are reported.
- **Option lists.** `@`-prefixed rows define reusable lists of allowed values
  that other rows point to from their `options` field (see
  [Option lists](#option-lists-keys)).
- **ABAC.** `accessor` (`system` / `application` / `all`) plus a bitwise
  `appAccess` vs the client's `appLevel` decide, per item, what a given client
  may see (see [Access control](#access-control-abac)).
- **Section markers.** Keys whose last note starts with `$` (e.g.
  `cp.config.$title`) are treated as section metadata and skipped.
- **Immutable by default.** The built object is **deep-frozen**, so it can't be
  mutated at runtime. Pass `{ lock: false }` for a mutable result; check
  `.isLocked` to see the current state.
- **Fail loud.** A corrupt row (unparseable value, missing/circular template, or
  malformed item) **throws** at construction — never a silent partial build (see
  [Validation](#validation--fail-loud)).

## Access Control (ABAC)

Each item declares an `accessor` — `system`, `application`, or `all` — and the
client constructing the `Configuard` declares its own `accessor`. Only items the
client is allowed to see are included in the built object:

- A **`system`** client sees `system` and `all` items.
- An **`application`** client sees `all` items, plus `application`/`all` items
  whose **`appAccess`** bit flags intersect the client's **`appLevel`**
  (a bitwise `&`). `application` items must declare an `appAccess`, and an
  `application` client must be constructed with an `appLevel`.

```ts
import { Configuard, AccessorType } from 'configuard';

// Application client flags (bitwise).
const WEB = 1 << 0;    // 0b001
const MOBILE = 1 << 1; // 0b010
const KIOSK = 1 << 2;  // 0b100

const rows = [
  { accessor: 'application', appAccess: WEB | MOBILE, key: 'ui.theme', type: 'string', listType: 'none', value: 'dark', editable: true, requiresReboot: false, encrypt: false },
  { accessor: 'application', appAccess: KIOSK, key: 'kiosk.timeout', type: 'integer', listType: 'none', value: '30', editable: true, requiresReboot: false, encrypt: false },
  { accessor: 'all', appAccess: null, key: 'app.name', type: 'string', listType: 'none', value: 'Acme', editable: true, requiresReboot: false, encrypt: false }
];

// A mobile client (appLevel = MOBILE):
const cfg = new Configuard(rows, { accessor: AccessorType.APPLICATION, appAccess: MOBILE });

cfg.has('ui.theme');      // true   — (WEB|MOBILE) & MOBILE !== 0
cfg.has('kiosk.timeout'); // false  — KIOSK & MOBILE === 0
cfg.has('app.name');      // true   — `all` item, no appAccess
```

Combine with [`accesscontrol`](https://github.com/onury/accesscontrol) for
property-level filtering of the built object.

## Validation — Fail Loud

Configuration is foundational, so Configuard treats a corrupt row as a hard
error: the **constructor throws immediately** rather than logging a warning and
building a partial object. It throws when:

- a `value` can't be parsed to its declared `type` (e.g. bad `json`/`hexadecimal`/
  `time`/`date`, or a `number` that resolves to `NaN`);
- a `${...}` template reference is **missing** or **circular**;
- an item is **malformed** (invalid `accessor`/`listType`/`type`, or a
  non-string `key`).

```ts
try {
  const cfg = new Configuard(rows, { accessor: AccessorType.SYSTEM });
  // use cfg.data / cfg.get(...)
} catch (err) {
  // e.g. 'Configuard: Value "abc" of key "port" is not a valid number.'
  // the original parser error (when any) is available as `err.cause`.
}
```

> `parseFlat()` likewise throws on missing/circular templates, a missing option
> list, or a value outside its option list.

### `ConfiguardError`

All failures throw a **`ConfiguardError`** (exported from the package root), so
consumers can react to a configuration fault specifically:

```ts
import { Configuard, ConfiguardError } from 'configuard';

try {
  new Configuard(rows, { accessor: AccessorType.SYSTEM });
} catch (err) {
  if (err instanceof ConfiguardError) {
    err.key;    // the offending config item key, when known
    err.cause;  // the underlying error (e.g. the parser failure), when any
  }
}
```

## Locking (Immutability)

The object returned by `build()` (the constructor) is **deep-frozen by default** —
every nested object and array is recursively `Object.freeze`d — so runtime config
can't be mutated by accident. Opt out with `{ lock: false }`:

```ts
const locked = new Configuard(rows, { accessor: AccessorType.SYSTEM });
locked.isLocked;                 // true
Object.isFrozen(locked.data);    // true
// locked.data.x = 1;            // throws in strict mode

const mutable = new Configuard(rows, { accessor: AccessorType.SYSTEM }, { lock: false });
mutable.isLocked;                // false
```

## Encryption

Items flagged `encrypt: true` can be stored **encrypted at rest**. Configuard is
crypto-agnostic — you supply a **synchronous** `decrypt` hook, which it applies
(before templating/parsing) to those items while building:

```ts
const cfg = new Configuard(rows, { accessor: AccessorType.SYSTEM }, {
  decrypt: (value, item) => myDecrypt(value) // return the plaintext string
});

cfg.isEncrypted('db.password'); // true
cfg.get('db.password');         // the decrypted plaintext value
```

Decryption is **opt-in**: without a `decrypt` hook, `encrypt: true` values are
used as-is. A failing hook throws a `ConfiguardError`. (Re-encrypting edited
values on save is handled by `serializeFlat()` — see below.)

## Value Types

`type` declares how a row's raw string `value` is parsed. See the `ValueType`
enum.

| `type`        | Parses into | Notes |
|---------------|-------------|-------|
| `null`        | `null`      | |
| `string`      | `string`    | Value used as-is. |
| `boolean`     | `boolean`   | `"true"`/`"1"` → `true`. |
| `number`      | `number`    | Integer or float. |
| `integer`     | `number`    | Base-10 integer. |
| `float`       | `number`    | Floating-point. |
| `hexadecimal` | `number`    | Hex string, with or without `0x`. Invalid hex **throws**. |
| `datetime`    | `Date`      | Date **and** time (RFC 2822 / ISO 8601). |
| `date`        | `string`    | Calendar date **without** a time part (e.g. `"2026-06-15"`). Kept as the validated string; a value with a time, or an invalid date, **throws**. |
| `time`        | `string`    | Clock time `HH:mm` or `HH:mm:ss` (e.g. `"14:30"`). Kept as the validated string; out-of-range values like `"90:77"` **throw**. |
| `regexp`      | `RegExp`    | `/pattern/flags` or a plain pattern. |
| `json`        | `any`       | `JSON.parse` (object, array, …). |
| `any`         | inferred    | Best-effort auto-detection. |

> `date` and `time` are intentionally kept as **validated strings** (not `Date`
> objects), since they carry no full timestamp — use `datetime` when you need a
> `Date`.

## List Types

`listType` controls whether a value is a single value or a list.

| `listType` | Result | Empty value → |
|------------|--------|---------------|
| `none`     | A single parsed value of `type`. | `null` (or `""` for `string`). |
| `array`    | An **array** of values, each parsed to `type` (value is split on commas). | `[]` |
| `csl`      | A normalized **comma-separated string** (whitespace around separators trimmed). | `""` |

```ts
// listType: 'array', type: 'integer', value: '1, 2, 3'   →  [1, 2, 3]
// listType: 'csl',   type: 'string',  value: 'a , b ,c'  →  'a,b,c'
```

## Option Lists (`@`-keys)

An admin UI often needs to constrain a field to a set of allowed values
(dropdowns, multi-selects). Configuard models this with **option lists**:

- A row whose `key` starts with `@` is an **option list definition**, not a
  config value. Only its `value` matters, and it is **always** treated as a
  comma-separated list (regardless of `type`/`listType`).
- Other rows reference an option list from their **`options`** field using a
  template: `"${@UIColors}"`.

Option-list rows are **excluded from `build()`** output (they aren't real
config). To resolve them, use [`parseFlat()`](#parseflat--flat-output-for-admin-uis).

How a field's `value` relates to its option list:

- `listType: none` → the value must be **one** member of the option list.
- `listType: csl` / `array` → the value may contain **several** members.
- A value outside the option list **throws** during `parseFlat()`.

## `parseFlat()` — flat output for admin UIs

`Configuard.parseFlat(configList)` returns the **same flat list** (not a nested
object) with:

- every `${...}` placeholder in `value` resolved — the value stays a **string**
  (it is *not* cast to its `type`);
- every `@`-key option list extracted into a separate `@` object, each as a
  trimmed, **uncast** string array (ready to populate a UI control); and
- every `options` reference expanded into that string array.

```ts
import { Configuard } from 'configuard';

const { '@': optionLists, configList } = Configuard.parseFlat([
  { accessor: 'system', key: '@UIColors', type: 'string', listType: 'csl', value: 'Blue,Red,Green', /* … */ },
  { accessor: 'system', key: 'device.ui.colors', type: 'string', listType: 'csl', value: 'Blue,Red', options: '${@UIColors}', /* … */ },
  { accessor: 'system', key: 'port', type: 'integer', listType: 'none', value: '8081', /* … */ },
  { accessor: 'system', key: 'environment.internalPort', type: 'integer', listType: 'none', value: '${port}', /* … */ }
]);

optionLists;
// { UIColors: ['Blue', 'Red', 'Green'] }

configList;
// [
//   { key: '@UIColors',                value: 'Blue,Red,Green', options: null,                   listType: 'csl',  … },
//   { key: 'device.ui.colors',         value: 'Blue,Red',       options: ['Blue','Red','Green'], listType: 'csl',  … },
//   { key: 'port',                     value: '8081',           options: null,                   listType: 'none', … },
//   { key: 'environment.internalPort', value: '8081',           options: null,                   listType: 'none', … }  // ${port} resolved
// ]
```

`build()` vs `parseFlat()`:

| | `build()` (constructor) | `parseFlat()` |
|---|---|---|
| Output shape | Nested object | Flat list (+ `@` option lists) |
| `value` | Parsed/cast to `type` | Resolved template, kept as string |
| `@`-keys | Excluded | Kept (in list **and** `@`) |
| `options` | Ignored | Expanded to string arrays |
| ABAC filtering | Yes | No |

## Saving Edits — `serializeFlat()`

`Configuard.serializeFlat(configList, edits, options?)` is the **inverse** of
`parseFlat()`: it turns the admin's edits back into DB-ready rows. For each edit
it enforces `editable`, validates the value against its `type` and `options`,
serializes it to the storage string, optionally re-encrypts `encrypt: true`
values, and returns the **diff** of changed rows.

- `edits` maps a config `key` to the changed fields (`Partial<IConfigItem>` — a
  `value` and/or metadata such as `editable`). Only keys you pass are processed;
  every other row is left untouched (so `${...}` templates are preserved).
- Returns `{ updates, requiresReboot }` — `updates` is the changed rows
  (`{ key, id, value, requiresReboot }`), `requiresReboot` is the aggregate.
  Pass `{ diffOnly: false }` to also get the full merged `rows`.

```ts
const { updates, requiresReboot } = Configuard.serializeFlat(rows, {
  'ui.theme': { value: 'dark' },
  port:       { value: '9090' },
  'db.password': { value: 'newSecret' } // encrypt:true row → re-encrypted below
}, {
  encrypt: (value, item) => myEncrypt(value) // for encrypt:true items
});

// updates: [{ key:'ui.theme', id, value:'dark', requiresReboot:false }, …]
// requiresReboot: true   (if any changed row requires it)
```

Serialization is **validate-then-store**: numbers/booleans are canonicalized,
lists are comma-joined, and other types (`hex`/`date`/`time`/`regexp`/`json`/…)
are stored as the validated string. Invalid values, option-list violations, a
non-editable value change, or an `encrypt` hook error throw a `ConfiguardError`.

## API

### `new Configuard(rawConfigList, accessorInfo?, options?)`

- `rawConfigList: IConfigItem[]` — the flat config rows.
- `accessorInfo?: { accessor?: AccessorType; appAccess?: number }` — defaults to
  `application`. Throws if `accessor` is `all`, or `application` without an
  `appAccess` level.
- `options?: { debugLogs?: boolean; lock?: boolean; decrypt? }` — `debugLogs`
  enables verbose `console` logging; `lock` (default `true`) deep-freezes the
  built object (set `false` for a mutable result); `decrypt` decrypts
  `encrypt: true` items (see [Encryption](#encryption)).
- **Throws** on a corrupt config (see [Validation](#validation--fail-loud)).

### Instance Members

- `.data` — the built, nested configuration object (frozen unless `lock: false`).
- `.get<T>(path, defaultValue?)` — typed read of a property by notation.
- `.has(path)` — whether a property exists at the given notation.
- `.accessor` — the resolved accessor for this instance.
- `.isLocked` — whether the built object is locked (deep-frozen).
- `.getMeta(key)` — a read-only view of a **visible** item's metadata (`type`,
  `editable`, `requiresReboot`, `encrypt`, `options`, `id`, …), or `undefined`.
- `.isEncrypted(key)` — whether the item is flagged to be encrypted at rest.
- `.requiresReboot(key)` — whether changing the item requires a reboot.

> The metadata accessors are **ABAC-consistent**: they only answer for keys
> visible to this instance's accessor (mirroring `.has()`), returning
> `undefined`/`false` otherwise.

### Static Members

- `Configuard.parseFlat(configList)` — resolve templates + option lists into a
  flat structure (see above). Returns `{ '@': Record<string, string[]>,
  configList: IFlatConfigItem[] }`.
- `Configuard.serializeFlat(configList, edits, options?)` — validate + serialize
  admin edits into a diff of DB-ready rows (the inverse of `parseFlat`; see
  [Saving edits](#saving-edits--serializeflat)). Returns
  `{ updates: IConfigUpdate[], requiresReboot: boolean, rows? }`.
- `Configuard.isConfigItem(o)` — `IConfigItem` type guard.

## The Config Item

Each row implements `IConfigItem`, mirroring the reference `config` table (see
[`docs/config.sql`](./docs/config.sql)):

| Field | Type | Meaning |
|-------|------|---------|
| `accessor` | `AccessorType` | `system` / `application` / `all`. |
| `appAccess` | `number \| null` | Bitwise flags for application clients (ABAC). |
| `key` | `string` | Dot/bracket notation; leading `@` marks an option list. |
| `type` | `ValueType` | How `value` is parsed (see [Value types](#value-types)). |
| `listType` | `ListType` | `none` / `array` / `csl` (see [List types](#list-types)). |
| `value` | `string \| null` | The raw value to parse; may contain `${...}` templates. |
| `options` | `string \| null` | Allowed values, or a `"${@name}"` option-list reference. |
| `defaultValue` | `string \| null` | Factory value for reverting. |
| `requiresReboot` | `boolean` | Whether changing it requires a reboot. |
| `editable` | `boolean` | Whether the accessor may edit it. |
| `encrypt` | `boolean` | Whether the value should be encrypted when fetched. |
| `description` | `string \| null` | Human-readable description. |

See [`docs/config.sql`](./docs/config.sql) for the reference `config` table.

## Documentation

Read the full [**documentation**][docs] — guides, concepts and the API reference.

## Quality

- **100% test coverage** (statements, branches, functions, lines) — enforced in
  CI via Vitest thresholds. Run `npm run cover`.
- **~90% mutation score** via [StrykerJS](https://stryker-mutator.io/). Run
  `npm run mutation`.

[Mutation testing](https://stryker-mutator.io/docs/) goes a step beyond
coverage: it makes hundreds of tiny edits ("mutants") to the source — flipping
`>` to `>=`, `&&` to `||`, returning `undefined`, etc. — and checks that a test
**fails** for each. It catches tests that *execute* code without actually
*asserting* its behavior (the trap where `function getPositive(x){ return x }`
hits 100% coverage but never verifies anything). The remaining surviving mutants
here are [equivalent mutants](https://stryker-mutator.io/docs/mutation-testing-elements/equivalent-mutants/)
(redundant fast-path guards that produce identical results). The general-purpose
date utilities (`parseDate`/`createUTCDate`) are fully unit-tested but excluded
from the mutation scope, as their date-format regexes are dominated by
equivalent mutants.

## License

© 2026, Onur Yıldırım. [**MIT**][license] License.

[license]:https://github.com/onury/configuard/blob/main/LICENSE
[docs]:https://onury.io/configuard