import type { IConfigItem } from './IConfigItem.js';

/**
 * Options for initializing `Configuard`.
 *
 */
export interface IConfiguardOptions {
  /**
   * Whether to enable debug logs. If set to `true`,
   * `Configuard` will log detailed information about
   * the configuration loading and validation process,
   * which can be helpful for troubleshooting.
   * @default false
   */
  debugLogs?: boolean;

  /**
   * Whether to deep-freeze the built configuration object so it cannot be
   * mutated at runtime. Recursively freezes nested objects and arrays. Set to
   * `false` to get a mutable result.
   * @default true
   */
  lock?: boolean;

  /**
   * Hook to decrypt the stored value of items marked `encrypt: true`, applied
   * (before templating and type-parsing) while building the configuration
   * object. `Configuard` is crypto-agnostic: you supply how to decrypt (your
   * KMS, a symmetric key via Node's `crypto`, etc.).
   *
   * Decryption is **opt-in**: without this hook, `encrypt: true` values are
   * used as-is. If the hook throws, a `ConfiguardError` is thrown. The function
   * must be **synchronous**.
   *
   * @param value The stored (encrypted) string value.
   * @param item A read-only view of the config item (e.g. to vary the key).
   * @returns The decrypted plaintext string.
   */
  decrypt?: (value: string, item: Readonly<IConfigItem>) => string;
}
