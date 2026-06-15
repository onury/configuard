import type { IConfigItem } from './IConfigItem.js';

/**
 * A single changed configuration row produced by `ConfGuard.serializeFlat()`,
 * ready to be persisted (e.g. an `UPDATE` on the `config` table).
 */
export interface IConfigUpdate {
  /** Dot/bracket-notation key of the changed item. */
  key: string;
  /** Record id of the item (from the original row), if any. */
  id?: number | null;
  /** The serialized (DB-ready) string value, or `null`. */
  value: string | null;
  /** Whether changing this item requires a reboot. */
  requiresReboot: boolean;
}

/**
 * The result of `ConfGuard.serializeFlat()`.
 */
export interface ISaveResult {
  /** The changed rows (value or metadata differs from the original). */
  updates: IConfigUpdate[];
  /** `true` if any changed row requires a reboot. */
  requiresReboot: boolean;
  /**
   * The full merged `IConfigItem` rows for the changed items. Only present when
   * `serializeFlat()` is called with `{ diffOnly: false }`.
   */
  rows?: IConfigItem[];
}

/**
 * Options for `ConfGuard.serializeFlat()`.
 */
export interface ISerializeOptions {
  /**
   * When `true` (default), only the diff (`updates`) is returned. Set to
   * `false` to also receive the full merged `rows` for the changed items.
   * @default true
   */
  diffOnly?: boolean;

  /**
   * Hook to encrypt the serialized value of items marked `encrypt: true`,
   * applied when their value is edited. `ConfGuard` is crypto-agnostic: you
   * supply how to encrypt. The function must be **synchronous**.
   *
   * @param value The serialized (plaintext) string value.
   * @param item A read-only view of the (merged) config item.
   * @returns The encrypted string to store.
   */
  encrypt?: (value: string, item: Readonly<IConfigItem>) => string;
}
