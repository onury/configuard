---
title: Encryption
description: Store sensitive values encrypted at rest. Supply a synchronous decrypt hook to read them, and an encrypt hook to save them.
---

Items flagged `encrypt: true` can be stored **encrypted at rest**. Configuard is
crypto-agnostic — it never picks an algorithm for you. You supply a
**synchronous** hook, and it applies that hook to the flagged items.

## Decrypting on Build

Pass a `decrypt` hook; Configuard applies it to `encrypt: true` items **before**
templating and parsing, while building:

```ts
const cfg = new Configuard(rows, { accessor: AccessorType.SYSTEM }, {
  decrypt: (value, item) => myDecrypt(value) // return the plaintext string
});

cfg.isEncrypted('db.password'); // true
cfg.get('db.password');         // the decrypted plaintext value
```

Decryption is **opt-in**: without a `decrypt` hook, `encrypt: true` values are
used as-is (with a debug warning if `debugLogs` is on). A hook that throws raises
a [`ConfiguardError`](/configuard/concepts/validation/) — the failure is never
swallowed.

## Encrypting on Save

The inverse runs in [`serializeFlat()`](/configuard/guides/admin-ui/): pass an
`encrypt` hook and edited `encrypt: true` values are re-encrypted before they
land in the diff:

```ts
const { updates } = Configuard.serializeFlat(rows, {
  'db.password': { value: 'newSecret' }
}, {
  encrypt: (value, item) => myEncrypt(value) // for encrypt:true items
});
// updates[0].value is the encrypted string, ready to store
```

Both hooks receive the plaintext/stored string and a read-only view of the
config item — so you can vary the key or algorithm per item (e.g. route by
`item.key`). Both must be **synchronous**.
