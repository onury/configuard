---
title: Validation — Fail Loud
description: A corrupt row throws at construction rather than silently producing a partial object. Catch it with ConfiguardError.
---

Configuration is foundational, so Configuard treats a corrupt row as a hard
error: the **constructor throws immediately** rather than logging a warning and
building a partial object. It throws when:

- a `value` can't be parsed to its declared
  [`type`](/configuard/concepts/value-types/) (e.g. bad
  `json`/`hexadecimal`/`time`/`date`, or a `number` that resolves to `NaN`);
- a `${...}` [template](/configuard/concepts/templating/) reference is
  **missing** or **circular**;
- an item is **malformed** — an invalid `accessor`/`listType`/`type`, or a
  non-string `key`.

```ts
try {
  const cfg = new Configuard(rows, { accessor: AccessorType.SYSTEM });
  // use cfg.data / cfg.get(...)
} catch (err) {
  // e.g. 'Value "abc" of key "port" is not a valid number.'
  // the original parser error (when any) is available as err.cause
}
```

[`parseFlat()`](/configuard/guides/admin-ui/) likewise throws on missing/circular
templates, a missing option list, or a value outside its option list.

## `ConfiguardError`

Every failure throws a [`ConfiguardError`](/configuard/api/classes/configuarderror/)
(exported from the package root), so consumers can react to a configuration
fault specifically:

```ts
import { Configuard, ConfiguardError } from 'configuard';

try {
  new Configuard(rows, { accessor: AccessorType.SYSTEM });
} catch (err) {
  if (err instanceof ConfiguardError) {
    err.key;   // the offending config item key, when known
    err.cause; // the underlying error (e.g. the parser failure), when any
  }
}
```

`key` and `cause` are what make these errors actionable: `key` points at the
exact row to fix, and `cause` carries the lower-level error when the fault came
from the value parser or a crypto hook.
