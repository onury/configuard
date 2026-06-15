// dep modules
import { Notation } from 'notation';

// own modules
import { ConfGuardError } from './ConfGuardError.js';
import { AccessorType, ListType, ValueType } from './enums/index.js';
import type {
  IAccessorInfo,
  IConfGuardOptions,
  IConfigItem,
  IConfigUpdate,
  IFlatConfig,
  IFlatConfigItem,
  ISaveResult,
  ISerializeOptions,
  UnknownObject
} from './types/index.js';
import { deepFreeze, hasValue, isArray, isStrSet, parse } from './utils/index.js';

// CAUTION: DO NOT MODIFY!
// template regex for config value DB. e.g. `"${some.notation}"`
const RE_CONFIG_TEMPLATE = /\$\{\s*([^}]*?)\s*\}/g;
const RE_SEPARATOR = /\s*,\s*/g;
// matches an option-list reference, e.g. `"${@UIColors}"` -> captures `UIColors`.
const RE_OPTION_REF = /^\$\{\s*@\s*([^}]+?)\s*\}$/;
// leading `@` in a key marks an "option list" item (not a real config).
const OPTION_PREFIX = '@';
// prefix for debug (console) log lines, to identify the source. Errors use the
// `ConfGuardError` class instead (its `name` identifies them).
const MSG_PREFIX = 'ConfGuard: ';

// no-op logger sink (used when `debugLogs` is disabled, see #log).
const noop = (): void => {};

// we need to take care of notation if the key is not a proper JS
// var name. e.g. "@someProp" should be notated as "['@someProp']"
const normalizeKey = (key: string): string => (Notation.isValid(key) ? key : `['${key}']`);

// Splits a comma-separated value into trimmed, uncast string items.
const toList = (value: unknown): string[] =>
  isStrSet(value as string) ? (value as string).split(RE_SEPARATOR).map((s) => s.trim()) : [];

// Parses a non-empty string value to its declared `type`. `parse()` treats the
// `"any"` type as auto-detect. Fails loud: throws a `ConfGuardError` if the
// value cannot be parsed to its type, or if it resolves to `NaN`.
function parseValue(value: string, type: string, key: string): unknown {
  let parsed: unknown;
  try {
    parsed = parse(value, type);
  } catch (error) {
    throw new ConfGuardError(`Failed to parse value "${value}" of key "${key}".`, {
      cause: error,
      key
    });
  }
  if (typeof parsed === 'number' && Number.isNaN(parsed)) {
    throw new ConfGuardError(`Value "${value}" of key "${key}" is not a valid ${type}.`, { key });
  }
  return parsed;
}

// Serializes a single (validated) scalar string to its DB-storage form:
// booleans → "true"/"false", numerics → canonical `String(n)`, and everything
// else (string/hex/date/time/regexp/json/datetime/any) is stored as-is after
// validation. Throws a `ConfGuardError` on an invalid value.
function serializeScalar(value: string, type: ValueType, key: string): string {
  const parsed = parseValue(value, type, key);
  if (type === ValueType.BOOLEAN) return String(parsed);
  if (type === ValueType.NUMBER || type === ValueType.INTEGER || type === ValueType.FLOAT) {
    return String(parsed);
  }
  return value.trim();
}

/**
 * Builds a nested, typed configuration object from a flat list of configuration
 * items (typically rows from a `config` database table). Supports `${...}`
 * value templating and accessor-based (ABAC) filtering of items.
 */
export class ConfGuard {
  private _: {
    accessor: AccessorType;
    appLevel?: number | null;
    rawConfigList: IConfigItem[];
    notation: Notation;
    debug: boolean;
    // source items that are visible (ABAC-allowed) to this accessor, keyed by
    // their (trimmed) `key`. Backs the metadata accessors (`getMeta`, etc.).
    allowed: Map<string, IConfigItem>;
    // optional, synchronous decrypt hook for `encrypt: true` items.
    decrypt?: (value: string, item: Readonly<IConfigItem>) => string;
    // items already run through the decrypt hook (guards against double-decrypt
    // when an item is both built and referenced by a template).
    decrypted: WeakSet<IConfigItem>;
  };

  /**
   * Initializes a new instance of `ConfGuard` with the given parameters.
   *
   * @param rawConfigList Raw configuration list (typically fetched from a
   * config database table).
   * @param [accessorInfo] Accessor information of the client making use of
   * this class. `accessor` defaults to `"application"`. Hint: on a
   * backend/server-side, set `accessor` to `AccessorType.SYSTEM`; on a client
   * application (website, desktop or mobile app) set it to
   * `AccessorType.APPLICATION` and provide `appAccess`.
   * @param [options] Options for initializing `ConfGuard`. Set
   * `debugLogs: true` to enable verbose `console` logging; `lock: false` for a
   * mutable (non-frozen) result; `decrypt` to decrypt `encrypt: true` items.
   *
   * @throws {ConfGuardError} If `accessor` is `"all"`, or `"application"`
   * without an `appLevel`.
   * @throws {ConfGuardError} If the raw config is corrupt: an item with an
   * unparseable `value` (or a `value` that resolves to `NaN`), a missing or
   * circular `${...}` template reference, or a malformed item (invalid
   * `accessor`/`listType`/`type`, or a non-string `key`). `ConfGuard` fails
   * loud — it never silently skips a corrupt item.
   * @throws {ConfGuardError} If a provided `decrypt` hook throws.
   */
  constructor(
    rawConfigList: IConfigItem[],
    accessorInfo?: IAccessorInfo,
    options?: IConfGuardOptions
  ) {
    const accessor = accessorInfo?.accessor || AccessorType.APPLICATION;
    if (!accessor || accessor === AccessorType.ALL) {
      throw new ConfGuardError(
        `Cannot set accessor to "${accessor}". Set it either to "system" or "application".`
      );
    }

    const appLevel = accessorInfo?.appAccess;

    this._ = {
      accessor,
      // pass the application's configFlag (if any).
      appLevel: appLevel ?? null,
      rawConfigList,
      notation: new Notation(),
      debug: Boolean(options?.debugLogs),
      allowed: new Map<string, IConfigItem>(),
      decrypt: options?.decrypt,
      decrypted: new WeakSet<IConfigItem>()
    };

    if (this.accessor === AccessorType.APPLICATION && !this.appLevel) {
      throw new ConfGuardError('Invalid appLevel for application accessor.');
    }

    // Build the configuration object; lock (deep-freeze) it by default.
    this.build(options?.lock ?? true);
  }

  // --------------------------
  //  PUBLIC MEMBERS
  // --------------------------

  /** Gets the built, nested configuration object. */
  get data(): UnknownObject {
    return this._.notation.value;
  }

  /**
   * Specifies whether the built configuration object is locked (deep-frozen),
   * i.e. immutable. Controlled by the `lock` option (default `true`).
   */
  get isLocked(): boolean {
    return Object.isFrozen(this._.notation.value);
  }

  get accessor(): AccessorType {
    return this._.accessor;
  }

  get appLevel(): number | null | undefined {
    return this._.appLevel;
  }

  /**
   * Gets a typed configuration value by its dot/bracket-notation path.
   *
   * @param path Notation of the configuration property. e.g. `"ai.vision.provider"`.
   * @param [defaultValue] Value to return if the path is not set.
   */
  get<T = unknown>(path: string, defaultValue?: T): T | undefined {
    return this._.notation.get(normalizeKey(path), defaultValue) as T | undefined;
  }

  /**
   * Specifies whether a configuration property exists at the given path.
   * @param path Notation of the configuration property.
   */
  has(path: string): boolean {
    return this._.notation.has(normalizeKey(path));
  }

  /**
   * Gets a read-only view of the source configuration item (its metadata) for
   * the given key — or `undefined` if no such key exists or it is not visible
   * to this instance's accessor (ABAC).
   *
   * Unlike `get()` (which returns the parsed value), this exposes the item's
   * metadata: `type`, `listType`, `accessor`, `editable`, `requiresReboot`,
   * `encrypt`, `options`, `id`, etc.
   *
   * @param key Key (dot/bracket notation) of the configuration item.
   */
  getMeta(key: string): Readonly<IConfigItem> | undefined {
    const item = this._.allowed.get(key);
    // return a frozen shallow copy so callers can't mutate the source row.
    return item ? Object.freeze({ ...item }) : undefined;
  }

  /**
   * Specifies whether the configuration item at the given key is marked to be
   * encrypted at rest (`encrypt: true`). Returns `false` for unknown or
   * non-visible keys.
   * @param key Key (dot/bracket notation) of the configuration item.
   */
  isEncrypted(key: string): boolean {
    return Boolean(this._.allowed.get(key)?.encrypt);
  }

  /**
   * Specifies whether changing the configuration item at the given key requires
   * a reboot (`requiresReboot: true`). Returns `false` for unknown or
   * non-visible keys.
   * @param key Key (dot/bracket notation) of the configuration item.
   */
  requiresReboot(key: string): boolean {
    return Boolean(this._.allowed.get(key)?.requiresReboot);
  }

  // --------------------------
  //  PRIVATE MEMBERS
  // --------------------------

  private get notation(): Notation {
    return this._.notation;
  }

  // console-backed logger, gated by the `debugLogs` option. Used only for
  // non-fatal, best-effort warnings; corrupt config throws (see `parse`,
  // `processTemplate`, `build`).
  private get log(): { warn: (...args: unknown[]) => void } {
    return this._.debug ? { warn: console.warn.bind(console) } : { warn: noop };
  }

  private setConfigValue(item: IConfigItem): unknown {
    // Parse the whole value by its declared `type`. Scalars stay scalar
    // (e.g. "gemini" -> "gemini"); only list/array types (or comma-lists
    // parsed as arrays) become arrays. See `parse()`.

    let parsedValue: unknown = null;

    if (!isStrSet(item.value as string)) {
      if (item.listType === ListType.ARRAY) {
        parsedValue = [];
      } else if (item.listType === ListType.CSL || item.type === ValueType.STRING) {
        parsedValue = '';
      }
    } else if (item.listType === ListType.NONE) {
      parsedValue = parseValue(item.value as string, item.type, item.key);
    } else {
      // `array`/`csl`: parse each comma-separated part to its type.
      const parts = (item.value as string)
        .split(RE_SEPARATOR)
        .map((val: string) => parseValue(val, item.type, item.key));
      // `csl` joins the parsed parts back into a normalized string;
      // `array` keeps them as an array.
      parsedValue = item.listType === ListType.CSL ? parts.join(',') : parts;
    }

    if (parsedValue !== undefined) {
      // Setting "key" notation to result object.
      // e.g. key: "company.name" -> property: `result.company.name`.
      // We won't overwrite the value if the key already exists.
      this.notation.set(normalizeKey(item.key), parsedValue, false); // false: not overwriting
      return parsedValue;
    }

    return undefined;
  }

  // Decrypts an `encrypt: true` item's value in place (once), via the optional
  // `decrypt` hook, before it is templated/parsed. Decryption is opt-in: with
  // no hook, the value is used as-is (a debug warning is emitted). Fails loud:
  // a hook error becomes a `ConfGuardError`.
  private decryptItem(item: IConfigItem): void {
    if (!item.encrypt || this._.decrypted.has(item)) return;
    this._.decrypted.add(item);

    if (!this._.decrypt) {
      // Stryker disable all: debug warning only; no behavioral effect.
      this.log.warn(
        `${MSG_PREFIX}Item "${item.key}" is "encrypt: true" but no decrypt function was provided; using the value as-is.`
      );
      // Stryker restore all
      return;
    }

    // nothing to decrypt for an empty/null value.
    if (!isStrSet(item.value as string)) return;

    try {
      item.value = this._.decrypt(item.value as string, item);
    } catch (error) {
      throw new ConfGuardError(`Failed to decrypt value of key "${item.key}".`, {
        cause: error,
        key: item.key
      });
    }
  }

  // Replaces and/or parses the notation (key) of the given configuration item.
  // `seen` tracks keys currently being resolved, to detect circular templates.
  // Fails loud: throws on a malformed item, or a missing/circular `${...}`
  // reference.
  //
  // @throws If the item is not a valid `IConfigItem` (invalid
  // `accessor`/`listType`/`type`, or non-string `key`).
  // @throws If a `${...}` reference is missing or circular.
  private processTemplate(item: IConfigItem, seen: Set<string> = new Set()): unknown {
    if (!ConfGuard.isConfigItem(item)) {
      // A malformed item's `key` is unreliable, so it's only included in the
      // message (not the structured `key` field).
      const k = (item as { key?: unknown }).key;
      throw new ConfGuardError(
        `Corrupt config item "${k}": invalid accessor, listType, type, or key.`
      );
    }

    // Decrypt the (possibly encrypted) value before templating/parsing.
    this.decryptItem(item);

    // First check if the item value includes any templates. e.g.
    // `${some.property}`.
    const hasTemplate = isStrSet(item.value as string)
      ? Boolean((item.value as string).match(RE_CONFIG_TEMPLATE))
      : false;

    // If this item has a template-free value, we'll parse item.value and
    // add the notated property (item.key) into the result object.
    if (!hasTemplate) {
      return this.setConfigValue(item);
    }

    // Guard against circular template references (e.g. a: "${b}",
    // b: "${a}") which would otherwise recurse forever.
    if (seen.has(item.key)) {
      throw new ConfGuardError(`Circular template reference detected at: "${item.key}"`, {
        key: item.key
      });
    }
    seen.add(item.key);

    // If this item has a value with templates (e.g.
    // "http://${company.domain}/path"), we'll recursively notate/replace
    // those templates until we get a raw value.
    const processedValue = (item.value as string).replace(
      RE_CONFIG_TEMPLATE,
      (match: string, templateKey: string) => {
        const tk = normalizeKey(templateKey);
        // Check if the result object already has this templated key.
        const resultItemValue: unknown = this.notation.get(tk);
        // If so, we'll get the (already parsed) value from the result
        // object via notation.
        if (resultItemValue !== undefined) {
          return String(resultItemValue);
        }
        // The result object does not have this notation yet. So, we'll
        // first get the original (raw) item from the initial list, then
        // recurse this same operation (processTemplate) to evaluate the
        // final value.
        const itemFromTemplate = this._.rawConfigList.find((i) => i.key === templateKey);
        if (itemFromTemplate) {
          return this.processTemplate(itemFromTemplate, seen) as string;
        }
        throw new ConfGuardError(`Referenced value for template is missing: "${match}"`, {
          key: item.key
        });
      }
    );

    // Finally, we set the processed/evaluated value for the initial item
    // and add the key/value as a property to the result object.
    item.value = processedValue;
    this.setConfigValue(item);

    // Checking if the processed value looks correct. Since this may include
    // parsed templates, it may include legitimately empty/"undefined" values
    // set by the admin/user (see CAUTION 1 on `build()`). This is a lenient
    // heuristic, so it only emits a debug warning; it has no effect on the
    // built result, so it is excluded from mutation testing.
    // Stryker disable all: debug-only heuristic, no behavioral effect.
    if (
      typeof processedValue === 'string' &&
      (processedValue.indexOf('undefined') >= 0 ||
        processedValue.indexOf('null') >= 0 ||
        processedValue.indexOf('[object') >= 0)
    ) {
      this.log.warn(
        `${MSG_PREFIX}Value of ${item.key} looks incorrect: "${processedValue}". Is this intended?`
      );
    }
    // Stryker restore all

    // we should also return the value (for recursion)
    return processedValue;
  }

  /**
   * Specifies whether the given configuration item is allowed by checking
   * accessor type and current application's level of access (if `accessor`
   * is set to `AccessorType.APPLICATION`).
   * @param item Configuration item to be checked.
   */
  private isItemAllowed(item: IConfigItem): boolean {
    // system accessor type items are allowed if accessor is system.
    if (this.accessor === AccessorType.SYSTEM) {
      return [AccessorType.SYSTEM, AccessorType.ALL].includes(item.accessor);
    }

    // all accessor type items, with no appAccess, are all allowed.
    if (item.accessor === AccessorType.ALL && !item.appAccess) return true;

    if (item.accessor === AccessorType.APPLICATION && !item.appAccess) {
      throw new ConfGuardError(`Invalid appAccess for application accessor (key: "${item.key}").`, {
        key: item.key
      });
    }

    // application and all (with appAccess) type items are allowed only if the
    // app level is appropriate.
    return Boolean(
      item.appAccess &&
        this.appLevel &&
        // eslint-disable-next-line no-bitwise
        item.appAccess & this.appLevel
    );
  }

  /**
   * Processes the given key-value config array. Each key is an object property
   * notation and each value is a string which will be parsed into a JS value.
   * This method builds a result-object with these keys and values. Any value
   * can also have embedded templated/placeholder keys for other values to be
   * parsed into it.
   *
   * Key (notation) example: `"website.paths.images"` has a string value with a
   * placeholder template: `"${files.content}/news/images"`
   *
   * <b>CAUTION 1</b>: Any placeholder key used in a higher role (lower
   * accessLevel) config value will parse `undefined` by nature.
   * e.g. `"${google.email}@gmail.com"` will result in `"undefined@gmail.com"`
   *
   * <b>CAUTION 2</b>: This method runs recursive operations. This process
   * might be heavy if a long list is passed. So, better run this once and
   * cache the output value for future use.
   *
   * @param lock Whether to deep-freeze the built object so it cannot be mutated.
   *
   * @throws If the raw config is corrupt: a non-string `key`, a malformed item,
   * an unparseable `value`, or a missing/circular `${...}` template reference.
   */
  private build(lock: boolean): void {
    const rawList = this._.rawConfigList;

    if (isArray(rawList)) {
      rawList.forEach((item: IConfigItem) => {
        // A non-string key is a corrupt config item — fail loud.
        if (typeof item.key !== 'string') {
          throw new ConfGuardError('Corrupt config item: "key" must be a string.');
        }
        const key = item.key.trim();

        // Keys starting with `@` are "option list" definitions (consumed via
        // `parseFlat()`), not real config values, so they're excluded here.
        //
        // if key notation has a last note starting with `$`, ignore this. we
        // support `$title`, `$info` notes for defining the config section within
        // the config table. e.g. `cp.config.$title` represents a title for the
        // `cp.config` object/section.
        if (!key.startsWith(OPTION_PREFIX) && !key.match(/\.\$[^.]*$/)) {
          item.key = key;
          if (this.isItemAllowed(item)) {
            // Track the first occurrence of each visible key (matching the
            // no-overwrite behavior of the built object) for metadata lookups.
            if (!this._.allowed.has(key)) this._.allowed.set(key, item);
            this.processTemplate(item);
          }
        }
      });
    }

    // Lock (deep-freeze) the built object by default, so runtime config is
    // immutable. Always applied — even to an empty object.
    if (lock) deepFreeze(this._.notation.value);
  }

  // --------------------------
  //  STATIC MEMBERS
  // --------------------------

  /**
   * Checks whether the given object is of type `IConfigItem`.
   * @param o Object to be checked.
   */
  static isConfigItem(o: unknown): o is IConfigItem {
    return (
      Boolean(o) &&
      typeof o === 'object' &&
      hasValue(AccessorType, (o as IConfigItem).accessor) &&
      hasValue(ListType, (o as IConfigItem).listType) &&
      hasValue(ValueType, (o as IConfigItem).type) &&
      typeof (o as IConfigItem).key === 'string'
    );
  }

  /**
   * Resolves a config list into a flat (non-nested) structure, intended for
   * admin/editor UIs where each row is rendered individually.
   *
   * Unlike `build()` — which produces a nested, type-cast object — this keeps
   * the original flat list but:
   * - resolves every `${...}` placeholder in each item's `value` (the value
   *   stays a string; it is **not** cast to its `type`);
   * - extracts every `@`-key "option list" into the returned `@` object (each
   *   as a trimmed, uncast string array); and
   * - replaces each item's `options` reference (e.g. `"${@UIColors}"`) with the
   *   resolved option-list array.
   *
   * When an item declares `options`, its `value` is validated against that
   * list: a `none` list type must hold a single member; `csl`/`array` may hold
   * several. A value outside the option list throws.
   *
   * @param configList Raw configuration list (typically fetched from a
   * `config` database table).
   * @returns The resolved option lists (`@`) and the flattened `configList`.
   *
   * @throws {ConfGuardError} If a `${...}` reference is missing or circular, if
   * an `options` reference points to a missing option list, or if a value is
   * not a member of its option list.
   */
  static parseFlat(configList: IConfigItem[]): IFlatConfig {
    const list = isArray(configList) ? configList : [];
    const byKey = new Map<string, IConfigItem>(list.map((i) => [i.key, i]));

    const isOption = (key: unknown): key is string =>
      typeof key === 'string' && key.startsWith(OPTION_PREFIX);

    // 1. Collect `@`-key option lists, keyed by the name after `@`. For these
    //    items, only `value` matters and it is always treated as a CSL string.
    const optionLists: Record<string, string[]> = {};
    for (const item of list) {
      if (isOption(item.key)) optionLists[item.key.slice(1)] = toList(item.value);
    }

    // Resolves `${...}` placeholders in a value to other items' (string)
    // values, recursively. `seen` guards against circular references.
    const resolveValue = (item: IConfigItem, seen: Set<string> = new Set()): string | null => {
      const value = item.value;
      if (!isStrSet(value as string)) return (value as string | null) ?? null;
      if (!(value as string).match(RE_CONFIG_TEMPLATE)) return value as string;

      if (seen.has(item.key)) {
        throw new ConfGuardError(`Circular template reference detected at: "${item.key}"`, {
          key: item.key
        });
      }
      seen.add(item.key);

      return (value as string).replace(RE_CONFIG_TEMPLATE, (match: string, key: string) => {
        const ref = byKey.get(key.trim());
        if (!ref) {
          throw new ConfGuardError(`Referenced value for template is missing: "${match}"`, {
            key: item.key
          });
        }
        const resolved = resolveValue(ref, seen);
        return resolved == null ? '' : String(resolved);
      });
    };

    // 2. Build the flattened list.
    const flatList: IFlatConfigItem[] = list.map((item) => {
      // `@`-key items pass through untouched, except their list type is
      // normalized to `csl` (their value is always a comma-separated list).
      if (isOption(item.key)) {
        return { ...item, listType: ListType.CSL, options: null };
      }

      const value = resolveValue(item);

      // Resolve the `options` reference (or inline csl) into a string array.
      let options: string[] | null = null;
      if (isStrSet(item.options as string)) {
        const ref = (item.options as string).match(RE_OPTION_REF);
        if (ref) {
          const name = ref[1];
          if (!(name in optionLists)) {
            throw new ConfGuardError(`Referenced option list is missing: "@${name}"`, {
              key: item.key
            });
          }
          options = optionLists[name];
        } else {
          options = toList(item.options);
        }
      }

      // Validate the value(s) against the option list, if any.
      if (options) {
        const allowed = options;
        const values =
          item.listType === ListType.NONE
            ? isStrSet(value as string)
              ? [value as string]
              : []
            : toList(value);
        for (const v of values) {
          if (!allowed.includes(v)) {
            throw new ConfGuardError(`Value "${v}" of "${item.key}" is not in its option list.`, {
              key: item.key
            });
          }
        }
      }

      return { ...item, value, options };
    });

    return { '@': optionLists, configList: flatList };
  }

  /**
   * Serializes admin edits back into DB-ready rows — the inverse of
   * `parseFlat()`. For each edit it enforces `editable`, validates the value
   * against its item's `type` and `options`, serializes the value to its
   * storage string, optionally encrypts `encrypt: true` values, and returns the
   * **diff** of changed rows.
   *
   * `edits` maps a config `key` to the changed fields (`Partial<IConfigItem>` —
   * a `value` and/or metadata such as `editable`). Only keys present in `edits`
   * are processed; every other row is left untouched (so `${...}` templates in
   * unedited rows are preserved).
   *
   * @param configList The original raw configuration list (the source of truth
   * for metadata, option lists, and the diff baseline).
   * @param edits Map of config key to the edited fields.
   * @param [options] `diffOnly` (default `true`) and an optional `encrypt` hook.
   * @returns The changed rows (`updates`), an aggregate `requiresReboot`, and —
   * when `diffOnly: false` — the full merged `rows`.
   *
   * @throws {ConfGuardError} If a key is not found, a non-editable item's value
   * is changed, a value is invalid for its `type`, a value is not in its option
   * list, a referenced option list is missing, or an `encrypt` hook throws.
   */
  static serializeFlat(
    configList: IConfigItem[],
    edits: Record<string, Partial<IConfigItem>>,
    options?: ISerializeOptions
  ): ISaveResult {
    const list = isArray(configList) ? configList : [];
    const byKey = new Map<string, IConfigItem>(list.map((i) => [i.key, i]));
    const diffOnly = options?.diffOnly !== false;
    const encrypt = options?.encrypt;

    // Collect `@`-key option lists (as in parseFlat) for value validation.
    const optionLists: Record<string, string[]> = {};
    for (const it of list) {
      if (typeof it.key === 'string' && it.key.startsWith(OPTION_PREFIX)) {
        optionLists[it.key.slice(1)] = toList(it.value);
      }
    }

    // Resolves an item's `options` (a `${@name}` ref or inline csl) to a list.
    const resolveOptions = (it: IConfigItem): string[] | null => {
      if (!isStrSet(it.options as string)) return null;
      const ref = (it.options as string).match(RE_OPTION_REF);
      if (!ref) return toList(it.options);
      const name = ref[1];
      if (!(name in optionLists)) {
        throw new ConfGuardError(`Referenced option list is missing: "@${name}"`, { key: it.key });
      }
      return optionLists[name];
    };

    // Validates + serializes the (merged) item's value to its storage string.
    const serializeItemValue = (it: IConfigItem): string | null => {
      const raw = it.value;
      if (!isStrSet(raw as string)) {
        // empty value: list types store "", scalars store null.
        return it.listType === ListType.NONE ? null : '';
      }
      const opts = resolveOptions(it);
      const values = it.listType === ListType.NONE ? [(raw as string).trim()] : toList(raw);
      if (opts) {
        for (const v of values) {
          if (!opts.includes(v)) {
            throw new ConfGuardError(`Value "${v}" of "${it.key}" is not in its option list.`, {
              key: it.key
            });
          }
        }
      }
      const serialized = values.map((v) => serializeScalar(v, it.type, it.key));
      return it.listType === ListType.NONE ? serialized[0] : serialized.join(',');
    };

    const updates: IConfigUpdate[] = [];
    const rows: IConfigItem[] = [];
    let requiresReboot = false;

    for (const [key, edit] of Object.entries(edits)) {
      const original = byKey.get(key);
      if (!original) {
        throw new ConfGuardError(`No config item found for key "${key}".`, { key });
      }

      const merged: IConfigItem = { ...original, ...edit };

      let finalValue: string | null = original.value ?? null;
      let valueChanged = false;

      if ('value' in edit) {
        if (original.editable === false && edit.value !== original.value) {
          throw new ConfGuardError(`Config item "${key}" is not editable.`, { key });
        }
        const serialized = serializeItemValue(merged);
        if (merged.encrypt && encrypt && isStrSet(serialized as string)) {
          try {
            finalValue = encrypt(serialized as string, merged);
          } catch (error) {
            throw new ConfGuardError(`Failed to encrypt value of key "${key}".`, {
              cause: error,
              key
            });
          }
        } else {
          finalValue = serialized;
        }
        valueChanged = finalValue !== (original.value ?? null);
      }
      merged.value = finalValue;

      // metadata change: any edited field other than `value` differs.
      const editRec = edit as Record<string, unknown>;
      const originalRec = original as unknown as Record<string, unknown>;
      const metaChanged = Object.keys(edit).some(
        (k) => k !== 'value' && editRec[k] !== originalRec[k]
      );

      if (valueChanged || metaChanged) {
        updates.push({
          key,
          id: merged.id ?? null,
          value: finalValue,
          requiresReboot: Boolean(merged.requiresReboot)
        });
        if (!diffOnly) rows.push(merged);
        if (merged.requiresReboot) requiresReboot = true;
      }
    }

    return diffOnly ? { updates, requiresReboot } : { updates, requiresReboot, rows };
  }
}
