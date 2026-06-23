---
title: FAQ
description: Common questions about Configuard — storage, immutability, crypto, async, and how it relates to notation and accesscontrol.
---

## Is Configuard tied to a particular database?

No. It works with a plain array of [`IConfigItem`](/configuard/concepts/config-item/)
rows. A `config` table is the typical source, but where they come from — MySQL,
Postgres, SQLite, a JSON file — is up to you. The
[reference schema](/configuard/concepts/config-item/#the-reference-table) is just
a convenient shape.

## Why is the built object frozen?

So backend code can't mutate live config by accident. The object is
[deep-frozen by default](/configuard/concepts/building/#immutability); pass
`{ lock: false }` if you genuinely need a mutable result.

## Can the `decrypt` / `encrypt` hooks be async?

No — both must be **synchronous**. The build and serialize paths are synchronous
end to end. If your KMS is async, fetch/decrypt the values **before** handing the
rows to Configuard.

## Does it validate types when I save edits?

Yes. [`serializeFlat()`](/configuard/guides/admin-ui/) validates each edited
value against its `type` and `options`, enforces `editable`, and throws a
[`ConfiguardError`](/configuard/concepts/validation/) on anything invalid — it is
validate-then-store, not store-then-hope.

## What happens to a corrupt row?

Construction [throws](/configuard/concepts/validation/) immediately. Configuard
never silently skips a bad row or builds a partial object.

## How does this relate to `notation`?

Configuard is built on [`notation`](https://github.com/onury/notation) — that's
what turns a dotted `key` (`device.ui.accent`) into a nested property, and backs
`.get()` / `.has()`. You don't interact with `notation` directly.

## Can I filter the built object further, per role?

Yes. Configuard's [ABAC](/configuard/concepts/access-control/) decides *which
rows* a client receives. For property-level filtering on top of that, combine it
with [`accesscontrol`](https://github.com/onury/accesscontrol).

## It won't import — "ERR_REQUIRE_ESM" / "cannot use import"

Configuard is **ESM-only**. See
[this note](https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7) on
consuming ESM packages.
