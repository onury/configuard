import type { IConfigItem } from './IConfigItem.js';

/**
 * A configuration item as produced by `Configuard.parseFlat()`.
 *
 * It mirrors `IConfigItem`, except that any `${...}` placeholders in `value`
 * are resolved (the value stays a string — it is not cast to its `type`), and
 * the `options` field is resolved from its referenced "option list" into a
 * string array (or `null` when the item has no options).
 */
export interface IFlatConfigItem extends Omit<IConfigItem, 'options'> {
  /**
   * Possible values for this configuration, resolved into a string array from
   * the referenced `@`-key option list (or an inline comma-separated list).
   * `null` when the item declares no options.
   */
  options?: string[] | null;
}

/**
 * The result of `Configuard.parseFlat()`.
 */
export interface IFlatConfig {
  /**
   * Resolved "option lists", keyed by the option-list name (the `key` without
   * its leading `@`). Each list is a string array of trimmed, uncast values,
   * ready to populate an admin UI (e.g. a select/dropdown).
   */
  '@': Record<string, string[]>;
  /**
   * The flattened configuration list: the same rows as the input, with `value`
   * templates resolved and `options` references expanded.
   */
  configList: IFlatConfigItem[];
}
