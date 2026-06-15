/**
 * Enumerates the types of the clients allowed to access another system, data
 * or configuration.
 * @enum {string}
 * @readonly
 */
export enum AccessorType {
  /**
   * Indicates that the target can be accessed by system (such as all
   * backend, server-side systems).
   */
  SYSTEM = 'system',
  /**
   * Indicates that the target can be accessed by an application (such as a
   * website, desktop or mobile app).
   */
  APPLICATION = 'application',
  /**
   * Indicates that the target can be accessed by both a system or an
   * application.
   */
  ALL = 'all'
}
