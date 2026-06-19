import type { ListType, ValueType } from '../enums/index.js';
import type { IAccessorInfo } from '../types/index.js';

/**
 * Interface for configuration items fetched from
 * a database config table.
 */
export interface IConfigItem extends IAccessorInfo {
  /**
   * Record ID.
   */
  id?: number | null;
  /**
   * Dot-notation of the configuration item as an object property.
   */
  key: string;
  /**
   * Data type of the configuration item. See `ValueType` enumeration for
   * possible values.
   */
  type: ValueType;
  /**
   *  Specifies the type of value list, indicating whether it's an array or
   *  comma separated list. Set to `"none"` if the value is not a list. See
   *  `ListType` enumeration for possible values. Default: `"none"`
   */
  listType: ListType;
  /**
   * Configuration item's value to be parsed into specified type.
   * @default null
   */
  value?: string | null;
  /**
   * Comma-delimited list of possible values for this configuration.
   */
  options?: string | null;
  /**
   * Initial (factory) value of the configuration. This should be used for
   * reverting the configuration.
   */
  defaultValue?: string | null;
  /**
   * Whether this configuration is editable by the accessor.
   * @default true
   */
  editable: boolean;
  /**
   * Whether this configuration requires the related app/system to be
   * rebooted, if changed.
   * @default false
   */
  requiresReboot: boolean;
  /**
   * Whether this configuration should be encrypted when fetched.
   * @default true
   */
  encrypt: boolean;
  /**
   * Description of the configuration item.
   */
  description?: string | null;
}
