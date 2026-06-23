---
title: Templating
description: Reference other config values with ${...} placeholders — resolved recursively, with circular and missing references caught.
---

A `value` may reference other keys with `${...}` placeholders. References are
resolved **recursively** while the object is built, so derived values stay in one
place instead of being duplicated across rows.

```ts
// rows:
//   environment.host          = 'device.local'
//   device.diagnostics.upload = 'https://${environment.host}/upload'

cfg.get('device.diagnostics.upload'); // 'https://device.local/upload'
```

A placeholder can point at another templated value; Configuard follows the chain
until it reaches a concrete value.

```ts
// port               = '8080'
// environment.intPort = '${port}'   →  8080
```

## Missing References Throw

If a `${...}` reference points at a key that doesn't exist, construction
[throws](/configuard/concepts/validation/):

```
ConfiguardError: Referenced value for template is missing: "${missing.key}"
```

## Circular References Are Detected

A cycle (`a` → `${b}`, `b` → `${a}`) would otherwise recurse forever. Configuard
tracks the keys being resolved and throws instead:

```
ConfiguardError: Circular template reference detected at: "a"
```

## A Note on Access-Filtered References

A template is only as resolvable as the rows **visible to the current
accessor**. If a value references a key the client can't see (a higher-privilege
[accessor](/configuard/concepts/access-control/)), that reference resolves to
`undefined` — e.g. `"${google.email}@gmail.com"` becomes
`"undefined@gmail.com"`. Keep templated values within the same access tier as
their references.

:::note
Templating also runs in [`parseFlat()`](/configuard/guides/admin-ui/), where the
resolved value is kept as a **string** rather than cast to its `type` — the same
missing/circular checks apply.
:::
