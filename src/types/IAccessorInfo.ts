import type { AccessorType } from '../enums/index.js';

/**
 * Interface for configuration accessor information.
 */
export interface IAccessorInfo {
  /**
   * Type of the clients allowed to access this configuration item. Either
   * "system", "application" or "all". See `AccessorType` enumeration.
   * @default "application"
   */
  accessor: AccessorType;
  /**
   * Bitwise value of client config flags which specifies which application
   * clients have access to this configuration item. Has no affect if
   * `accessor` is set to a value other than `"application"`.
   * @default null
   */
  appAccess?: number | null;
}
