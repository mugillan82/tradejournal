/**
 * Reports Domain — Errors
 *
 * Structured error classes for the Reports engine.
 */

export interface ReportFieldError {
  path: string;
  message: string;
}

export type ReportErrorCode =
  | "AUTH_REQUIRED"
  | "VALIDATION"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export class ReportServiceError extends Error {
  readonly code: ReportErrorCode;
  readonly httpStatus: number;
  readonly fieldErrors: ReadonlyArray<ReportFieldError>;

  constructor(
    code: ReportErrorCode,
    message: string,
    httpStatus: number,
    fieldErrors: ReadonlyArray<ReportFieldError> = [],
  ) {
    super(message);
    this.name = "ReportServiceError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.fieldErrors = fieldErrors;
  }
}

export function createAuthRequiredError(): ReportServiceError {
  return new ReportServiceError(
    "AUTH_REQUIRED",
    "Authentication required to access reports",
    401,
  );
}

export function createValidationError(
  fieldErrors: ReadonlyArray<ReportFieldError>,
  message = "Invalid report filter input",
): ReportServiceError {
  return new ReportServiceError("VALIDATION", message, 400, fieldErrors);
}

export function createDatabaseError(cause?: unknown): ReportServiceError {
  const msg =
    cause instanceof Error ? cause.message : "A database error occurred while generating reports";
  return new ReportServiceError("DATABASE_ERROR", msg, 500);
}
