/**
 * Options for constructing a {@link ConfGuardError}. Extends the standard
 * `ErrorOptions` (so a `cause` can be attached) with an optional config item
 * `key` for programmatic handling.
 */
export interface IConfGuardErrorOptions extends ErrorOptions {
  /** The config item key this error relates to, if any. */
  key?: string;
}

/**
 * Error thrown by `ConfGuard` for any configuration fault — a corrupt config
 * item, an invalid accessor, a failed `${...}` template, an option-list
 * violation, or a crypto-hook failure.
 *
 * Consumers can check `err instanceof ConfGuardError` to treat configuration
 * problems as the serious incidents they are. When the fault originates from a
 * lower-level error (e.g. the value parser), it is attached as `error.cause`;
 * the related config item key (when known) is available as `error.key`.
 */
export class ConfGuardError extends Error {
  override name = 'ConfGuardError';

  /** The config item key this error relates to, if available. */
  readonly key?: string;

  constructor(message = '', options?: IConfGuardErrorOptions) {
    super(message, options);
    this.key = options?.key;
  }
}
