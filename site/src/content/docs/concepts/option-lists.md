---
title: Option Lists
description: Reusable @-key lists of allowed values that other rows reference from their options field.
---

An admin UI often needs to constrain a field to a set of allowed values
(dropdowns, multi-selects). Configuard models this with **option lists**.

- A row whose `key` starts with `@` is an **option-list definition**, not a
  config value. Only its `value` matters, and it is **always** treated as a
  comma-separated list — regardless of `type`/`listType`.
- Other rows point at it from their **`options`** field with a template:
  `"${@UIColors}"`.

```ts
// @UIColors        (csl)  value: 'Blue,Red,Green,Amber'   ← the list
// device.ui.accent (none) value: 'Amber', options: '${@UIColors}'
```

## How a field relates to its list

The field's `listType` decides how many members its value may hold:

- `listType: none` → the value must be **one** member of the list.
- `listType: csl` / `array` → the value may contain **several** members.
- A value outside the list **throws** during [`parseFlat()`](/configuard/guides/admin-ui/).

## Where they show up

Option-list rows are **excluded from `build()`** — they aren't real config, so
they never appear in `.data`. To resolve them, use
[`parseFlat()`](/configuard/guides/admin-ui/), which extracts every `@`-key into
a separate `@` object (a trimmed, uncast string array) and expands each
`options` reference into that array — exactly what an editor UI needs to render
a control.

```ts
const { '@': optionLists, configList } = Configuard.parseFlat(rows);

optionLists;
// { UIColors: ['Blue', 'Red', 'Green', 'Amber'] }
```

See the [Admin UI Workflow](/configuard/guides/admin-ui/) for the full
round trip.
