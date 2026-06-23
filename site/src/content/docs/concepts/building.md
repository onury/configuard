---
title: Building & Reading
description: Construct a Configuard, read values with .data / .get() / .has(), inspect metadata, and control immutability.
---

The constructor does the work: it filters rows by
[accessor](/configuard/concepts/access-control/), resolves
[templates](/configuard/concepts/templating/), parses each value to its
[type](/configuard/concepts/value-types/), assembles the nested object, and
deep-freezes it.

```ts
import { Configuard, AccessorType } from 'configuard';

const cfg = new Configuard(rows, { accessor: AccessorType.SYSTEM });
```

## Reading

```ts
cfg.data;                          // the whole nested object (frozen)
cfg.get<number>('device.port');    // 8080         — typed read by notation path
cfg.get('missing.key', 'fallback'); // 'fallback'  — default when unset
cfg.has('device.ui.accent');       // true
```

`get()` and `has()` take a dot/bracket-notation path. `get<T>()` is a typed
read; the generic is a convenience cast, not a runtime check.

## Inspecting Metadata

Beyond the *value*, you can read the source row's *metadata* for any visible key:

```ts
cfg.getMeta('device.port');
// { accessor: 'system', key: 'device.port', type: 'integer',
//   editable: false, requiresReboot: true, encrypt: false, … }  (frozen)

cfg.isEncrypted('db.password');    // true
cfg.requiresReboot('device.port'); // true
```

These are **ABAC-consistent**: they only answer for keys visible to this
instance's accessor, returning `undefined`/`false` otherwise.

## Immutability

The built object is **deep-frozen by default** — every nested object and array
is recursively `Object.freeze`d — so runtime config can't be mutated by
accident. Opt out with `{ lock: false }`:

```ts
const locked = new Configuard(rows, { accessor: AccessorType.SYSTEM });
locked.isLocked;              // true
Object.isFrozen(locked.data); // true
// locked.data.x = 1;         // throws in strict mode

const mutable = new Configuard(rows, { accessor: AccessorType.SYSTEM }, { lock: false });
mutable.isLocked;             // false
```

:::caution
The build runs recursive template resolution. For a long list, build **once** and
reuse the instance rather than reconstructing per request.
:::

See the [API reference](/configuard/api/classes/configuard/) for the full member
list, and [Validation](/configuard/concepts/validation/) for what makes the
constructor throw.
