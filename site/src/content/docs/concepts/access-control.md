---
title: Access Control (ABAC)
description: Each row declares an accessor; clients see only the rows their accessor and bitwise app level allow.
---

Configuard filters rows **per item** as it builds. Each row declares an
`accessor` — `system`, `application`, or `all` — and the client constructing the
`Configuard` declares its own. Only rows the client is allowed to see make it
into the built object.

- A **`system`** client sees `system` and `all` items.
- An **`application`** client sees `all` items, plus `application`/`all` items
  whose **`appAccess`** bit flags intersect the client's **`appLevel`** (a
  bitwise `&`). `application` items must declare an `appAccess`, and an
  `application` client must be constructed with an `appLevel`.

```ts
import { Configuard, AccessorType } from 'configuard';

// Application client flags (bitwise).
const WEB    = 1 << 0; // 0b001
const MOBILE = 1 << 1; // 0b010
const KIOSK  = 1 << 2; // 0b100

const rows = [
  { accessor: 'application', appAccess: WEB | MOBILE, key: 'ui.theme',      type: 'string',  listType: 'none', value: 'dark', editable: true, requiresReboot: false, encrypt: false },
  { accessor: 'application', appAccess: KIOSK,        key: 'kiosk.timeout', type: 'integer', listType: 'none', value: '30',   editable: true, requiresReboot: false, encrypt: false },
  { accessor: 'all',         appAccess: null,         key: 'app.name',      type: 'string',  listType: 'none', value: 'Acme', editable: true, requiresReboot: false, encrypt: false }
];

// A mobile client (appLevel = MOBILE):
const cfg = new Configuard(rows, { accessor: AccessorType.APPLICATION, appAccess: MOBILE });

cfg.has('ui.theme');      // true   — (WEB|MOBILE) & MOBILE !== 0
cfg.has('kiosk.timeout'); // false  — KIOSK & MOBILE === 0
cfg.has('app.name');      // true   — `all` item, no appAccess
```

## Accessor rules

- `accessor` defaults to `application` when none is passed.
- Constructing with `accessor: 'all'` **throws** — `all` describes a *row's*
  reach, not a *client*. A client is either `system` or `application`.
- An `application` client with no `appLevel` **throws**.
- An `application` row with no `appAccess` **throws** when encountered during the
  build.

## Metadata is access-consistent

The metadata accessors —
[`getMeta`](/configuard/concepts/building/#inspecting-metadata),
[`isEncrypted`](/configuard/concepts/encryption/), and `requiresReboot` — only
answer for keys **visible to this instance's accessor**, mirroring `has()`. They
return `undefined`/`false` for anything the client can't see.

## Property-level filtering

ABAC here decides *which rows* a client gets. To filter the *properties* of the
built object further (per role, per attribute), combine it with
[`accesscontrol`](https://github.com/onury/accesscontrol).
