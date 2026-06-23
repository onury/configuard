---
title: Value & List Types
description: How a row's raw string value is parsed — the ValueType table, scalar-by-default behavior, and the three list types.
---

A row stores its `value` as a **string**. Two fields decide what it becomes in
the built object: `type` (the scalar kind) and `listType` (single value or
list).

## Value types

`type` declares how the raw string is parsed. See the
[`ValueType`](/configuard/api/enumerations/valuetype/) enum.

| `type` | Parses into | Notes |
|---------------|-------------|-------|
| `null` | `null` | |
| `string` | `string` | Used as-is. |
| `boolean` | `boolean` | `"true"`/`"1"` → `true`. |
| `number` | `number` | Integer or float. |
| `integer` | `number` | Base-10 integer. |
| `float` | `number` | Floating-point. |
| `hexadecimal` | `number` | Hex string, with or without `0x`. Invalid hex **throws**. |
| `datetime` | `Date` | Date **and** time (RFC 2822 / ISO 8601). |
| `date` | `string` | Calendar date with no time part (e.g. `"2026-06-15"`). Kept as the validated string; a value with a time, or an invalid date, **throws**. |
| `time` | `string` | Clock time `HH:mm` or `HH:mm:ss` (e.g. `"14:30"`). Kept as the validated string; out-of-range values like `"90:77"` **throw**. |
| `regexp` | `RegExp` | `/pattern/flags` or a plain pattern. |
| `json` | `any` | `JSON.parse` (object, array, …). |
| `any` | inferred | Best-effort auto-detection. |

`date` and `time` are intentionally kept as **validated strings**, not `Date`
objects — they carry no full timestamp. Use `datetime` when you need a `Date`.

A value that can't be parsed to its declared type
[**throws**](/configuard/concepts/validation/) at construction.

## Scalar by default

A value is parsed to one value of its `type` — `"gemini"` stays the string
`"gemini"`, `"8080"` (as `integer`) becomes the number `8080`. You do **not**
get a one-element array. Lists are opt-in via `listType`.

```ts
// type: 'integer', listType: 'none', value: '8080'  →  8080   (a number)
// type: 'string',  listType: 'none', value: 'gemini' →  'gemini'
```

## List types

`listType` controls whether a value is a single value or a list. See the
[`ListType`](/configuard/api/enumerations/listtype/) enum.

| `listType` | Result | Empty value → |
|------------|--------|---------------|
| `none` | A single parsed value of `type`. | `null` (or `""` for `string`). |
| `array` | An **array** of values, each parsed to `type` (the raw value is split on commas). | `[]` |
| `csl` | A normalized **comma-separated string** (whitespace around separators trimmed). | `""` |

```ts
// listType: 'array', type: 'integer', value: '1, 2, 3'  →  [1, 2, 3]
// listType: 'csl',   type: 'string',  value: 'a , b ,c' →  'a,b,c'
```

`array` and `csl` parse every comma-separated part to `type`, so a malformed
part throws just like a malformed scalar.
