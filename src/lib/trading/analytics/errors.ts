/**
 * Analytics Domain — Service Errors
 *
 * Domain-typed errors for the Analytics and Performance Engine.
 */

export type AnalyticsServiceErrorCode =
  | "VALIDATION"
  | "AUTH_REQUIRED"
  | "NOT_FOUND"
  | "DATABASE_ERROR";

export interface FieldError {
  readonly path: string;
  readonly message: string;
}

export class AnalyticsServiceError extends Error {
  public readonly code: AnalyticsServiceErrorCode;
  public readonly httpStatus: number;
  public readonly fieldErrors: ReadonlyArray<FieldError>;

  constructor(params: {
    code: AnalyticsServiceErrorCode;
    message: string;
    httpStatus: number;
    fieldErrors?: ReadonlyArray<FieldError>;
  }) {
    super(params.message);
    this.name = "AnalyticsServiceError";
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
}

export function createValidationError(
  fieldErrors: ReadonlyArray<FieldError>,
): AnalyticsServiceError {
  return new AnalyticsServiceError({
    code: "VALIDATION",
    message:
      fieldErrors.length === 1
        ? fieldErrors[0].message
        : `${fieldErrors.length} validation error(s)`,
    httpStatus: 400,
    fieldErrors,
  });
}

export function createAuthRequiredError(): AnalyticsServiceError {
  return new AnalyticsServiceError({
    code: "AUTH_REQUIRED",
    message: "Authentication required",
    httpStatus: 401,
  });
}

export function createNotFoundError(resource = "Resource"): AnalyticsServiceError {
  return new AnalyticsServiceError({
    code: "NOT_FOUND",
    message: `${resource} not found or not accessible`,
    httpStatus: 404,
  });
}

export function createDatabaseError(err: unknown): AnalyticsServiceError {
  console.error("[AnalyticsService] Database error:", err);
  return new AnalyticsServiceError({
    code: "DATABASE_ERROR",
    message: "An unexpected database error occurred. Please try again later.",
    httpStatus: 500,
  });
}
