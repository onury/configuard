# ConfGuard - Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](http://semver.org).


## 1.1.0 (2026-06-15)

### Added
- **Locking (immutability)**: the built configuration object is now
  **deep-frozen by default** so runtime config can't be mutated. New `lock`
  option (default `true`) on the constructor, a new `isLocked` getter, and a
  `deepFreeze` utility. Pass `{ lock: false }` for a mutable result.
- **`ConfGuard.serializeFlat(configList, edits, options?)`**: the inverse of
  `parseFlat()` for the admin save flow. Enforces `editable`, validates edits
  against `type`/`options`, serializes values to DB strings (optionally
  re-encrypting via an `encrypt` hook), and returns a diff of changed rows
  (`updates` + aggregate `requiresReboot`; full `rows` with `diffOnly: false`).
  Adds `IConfigUpdate`/`ISaveResult`/`ISerializeOptions` types.
- **Decryption hook**: an optional, synchronous `decrypt` constructor option,
  applied (before templating/parsing) to items flagged `encrypt: true`.
  Crypto-agnostic and opt-in; a failing hook throws a `ConfGuardError`.
- **Metadata accessors** on the instance: `getMeta(key)` (a frozen, read-only
  view of a visible item's metadata), `isEncrypted(key)`, and
  `requiresReboot(key)`. All are ABAC-consistent (answer only for keys visible
  to the instance's accessor).
- **`ConfGuardError`**: a dedicated error class (exported from the root) thrown
  for every configuration fault. Carries an optional `key` (the offending config
  item) and a `cause` (the underlying error). Lets consumers check
  `err instanceof ConfGuardError`.

### Changed
- All thrown errors are now `ConfGuardError` instances; the redundant
  `"ConfGuard: "` message prefix was dropped (the error `name` identifies them).
- **Fail loud on corrupt config**: the constructor now **throws immediately**
  on a corrupt config item — an unparseable `value` (or one that resolves to
  `NaN`), a missing or circular `${...}` template reference, or a malformed item
  (invalid `accessor`/`listType`/`type`, or a non-string `key`) — instead of
  silently logging a warning and building a partial object. The original parser
  error is attached as `Error.cause` where applicable. Documented via JSDoc
  `@throws`.


## 1.0.0 (2026-06-15)

Initial release.

### Added
- `ConfGuard` class: builds a nested, typed configuration object from a flat
  `IConfigItem[]` list.
- `${...}` value templating with recursive resolution and **circular-reference
  detection** (no infinite recursion).
- Accessor-based (ABAC) item filtering via `accessor` (`system`/`application`/`all`)
  and bitwise `appAccess` vs the client's `appLevel`.
- Typed access: `get<T>(path, defaultValue?)` and `has(path)`.
- `listType` (`none`/`array`/`csl`): values can be parsed as a single value, an
  array, or a normalized comma-separated string.
- **Option lists**: `@`-prefixed keys define reusable lists of allowed values;
  other items reference them from their `options` field (`"${@name}"`).
  `@`-keys are excluded from the built object.
- Static `ConfGuard.parseFlat(configList)`: resolves `${...}` value templates
  (kept as strings) and expands `options` into string arrays, returning a flat
  list plus an `@` map of option lists — intended for admin/editor UIs. Adds
  `IFlatConfig`/`IFlatConfigItem` types.
- Value types `hexadecimal` (validated hex → number), `date` (date-only,
  validated string), and `time` (`HH:mm`/`HH:mm:ss`, validated string);
  `datetime` yields a `Date`. Adds the `isTime()` helper.
- Self-contained value parser (`parse`) and helpers; no `lodash` runtime
  dependency.
- `$title`/`$info` section-marker keys are skipped during build.
- Reference schema in `example/config.sql`.

### Notes
- **Scalar by default**: values are parsed to their declared `ValueType`
  (`"gemini"` → `"gemini"`); use the `json` type for objects, or `listType` for
  lists. `date`/`time` are kept as validated strings (use `datetime` for a
  `Date`).
- Built on `notation` v3 (ESM, first-class types).
- Toolchain: TypeScript 6, ESM-only `tsc` build, Vitest (istanbul coverage),
  Biome, GitHub Actions. Shared config via `tsconfig-oy` and `biome-config-oy`.
