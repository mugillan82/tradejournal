/**
 * Trade Domain — Service Errors
 *
 * Stable, domain-typed error model used by the trade service.
 * Raw Prisma / database errors are never leaked to callers.
 *
 * Error codes:
 *   VALIDATION      – input data failed domain validation
 *   AUTH_REQUIRED   – no authenticated session found
 *   NOT_FOUND       – resource does not exist or is not accessible
 *   FORBIDDEN       – resource exists but belongs to another user
 *   DATABASE_ERROR  – unexpected database failure (details logged server-side)
 */

export type TradeServiceErrorCode =
  | "VALIDATION"
  | "AUTH_REQUIRED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "DATABASE_ERROR";

/**
 * Individual field-level validation failure.
 */
export interface FieldError {
  readonly path: string;
  readonly message: string;
}

/**
 * Service error returned by all trade service functions.
 *
 * This type is the only error shape callers should ever receive.
 * It NEVER contains raw Prisma errors, stack traces, or
 * internal implementation details.
 */
export class TradeServiceError extends Error {
  public readonly code: TradeServiceErrorCode;
  public readonly httpStatus: number;
  public readonly fieldErrors: ReadonlyArray<FieldError>;

  constructor(params: {
    code: TradeServiceErrorCode;
    message: string;
    httpStatus: number;
    fieldErrors?: ReadonlyArray<FieldError>;
  }) {
    super(params.message);
    this.name = "TradeServiceError";
    this.code = params.code;
    this.httpStatus = params.httpStatus;
    this.fieldErrors = params.fieldErrors ?? [];
  }

  /** True when the error is a validation failure with field-level details. */
  get isValidationError(): boolean {
    return this.code === "VALIDATION";
  }

  /** True when the error signals the user is unauthenticated. */
  get isAuthError(): boolean {
    return this.code === "AUTH_REQUIRED";
  }

  /** True when the requested resource does not exist. */
  get isNotFoundError(): boolean {
    return this.code === "NOT_FOUND";
  }

  /** True when the user lacks permission to access the resource. */
  get isForbiddenError(): boolean {
    return this.code === "FORBIDDEN";
  }
}

// ---------------------------------------------------------------------------
// Error factory helpers — the only way callers construct errors
// ---------------------------------------------------------------------------

export function createValidationError(
  fieldErrors: ReadonlyArray<FieldError>,
): TradeServiceError {
  return new TradeServiceError({
    code: "VALIDATION",
    message:
      fieldErrors.length === 1
        ? fieldErrors[0].message
        : `${fieldErrors.length} validation error(s)`,
    httpStatus: 400,
    fieldErrors,
  });
}

export function createAuthRequiredError(): TradeServiceError {
  return new TradeServiceError({
    code: "AUTH_REQUIRED",
    message: "Authentication required",
    httpStatus: 401,
  });
}

export function createNotFoundError(resource: string): TradeServiceError {
  return new TradeServiceError({
    code: "NOT_FOUND",
    message: `${resource} not found`,
    httpStatus: 404,
  });
}

export function createForbiddenError(): TradeServiceError {
  return new TradeServiceError({
    code: "FORBIDDEN",
    message: "You do not have permission to access this resource",
    httpStatus: 403,
  });
}

export function createDatabaseError(cause?: unknown): TradeServiceError {
  // The `cause` parameter is intentionally unused in the message —
  // we never leak raw error details to callers. It is kept in the
  // signature so call sites can pass it for server-side logging
  // instrumentation in the future.
  void cause;
  return new TradeServiceError({
    code: "DATABASE_ERROR",
    message: "An internal error occurred. Please try again later.",
    httpStatus: 500,
  });
}
