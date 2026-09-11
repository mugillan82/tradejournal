/**
 * Journal Domain — Service Errors
 *
 * Domain-typed errors for Journal, TradeNote, and Review operations.
 */

export type JournalServiceErrorCode =
  | "VALIDATION"
  | "AUTH_REQUIRED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "DATABASE_ERROR";

export interface FieldError {
  readonly path: string;
  readonly message: string;
}

export class JournalServiceError extends Error {
  public readonly code: JournalServiceErrorCode;
  public readonly httpStatus: number;
  public readonly fieldErrors: ReadonlyArray<FieldError>;

  constructor(params: {
    code: JournalServiceErrorCode;
    message: string;
    httpStatus: number;
    fieldErrors?: ReadonlyArray<FieldError>;
  }) {
    super(params.message);
    this.name = "JournalServiceError";
    this.code = params.code;
    this.httpStatus = params.httpStatus;
    this.fieldErrors = params.fieldErrors ?? [];
  }

  get isValidationError(): boolean {
    return this.code === "VALIDATION";
  }

  get isAuthError(): boolean {
    return this.code === "AUTH_REQUIRED";
  }

  get isNotFoundError(): boolean {
    return this.code === "NOT_FOUND";
  }

  get isForbiddenError(): boolean {
    return this.code === "FORBIDDEN";
  }

  get isConflictError(): boolean {
    return this.code === "CONFLICT";
  }
}

export function createValidationError(
  fieldErrors: ReadonlyArray<FieldError>,
): JournalServiceError {
  return new JournalServiceError({
    code: "VALIDATION",
    message:
      fieldErrors.length === 1
        ? fieldErrors[0].message
        : `${fieldErrors.length} validation error(s)`,
    httpStatus: 400,
    fieldErrors,
  });
}

export function createAuthRequiredError(): JournalServiceError {
  return new JournalServiceError({
    code: "AUTH_REQUIRED",
    message: "Authentication required",
    httpStatus: 401,
  });
}

export function createNotFoundError(resource = "Resource"): JournalServiceError {
  return new JournalServiceError({
    code: "NOT_FOUND",
    message: `${resource} not found or not accessible`,
    httpStatus: 404,
  });
}

export function createForbiddenError(): JournalServiceError {
  return new JournalServiceError({
    code: "FORBIDDEN",
    message: "You do not have permission to access this resource",
    httpStatus: 403,
  });
}

export function createConflictError(message: string): JournalServiceError {
  return new JournalServiceError({
    code: "CONFLICT",
    message,
    httpStatus: 409,
  });
}

export function createDatabaseError(err: unknown): JournalServiceError {
  console.error("[JournalService] Database error:", err);
  return new JournalServiceError({
    code: "DATABASE_ERROR",
    message: "An unexpected database error occurred. Please try again later.",
    httpStatus: 500,
  });
}
