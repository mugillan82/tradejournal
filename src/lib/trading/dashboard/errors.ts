/**
 * Dashboard Domain — Errors
 *
 * Domain error class and factories for dashboard operations.
 */

export type DashboardErrorType =
  | "VALIDATION"
  | "AUTH_REQUIRED"
  | "DATABASE_ERROR"
  | "UNKNOWN";

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export class DashboardServiceError extends Error {
  readonly type: DashboardErrorType;
  readonly fieldErrors?: ReadonlyArray<FieldError>;

  constructor(
    type: DashboardErrorType,
    message: string,
    fieldErrors?: ReadonlyArray<FieldError>,
  ) {
    super(message);
    this.name = "DashboardServiceError";
    this.type = type;
    this.fieldErrors = fieldErrors;
    Object.setPrototypeOf(this, DashboardServiceError.prototype);
  }
}

export function createValidationError(
  message: string,
  fieldErrors?: ReadonlyArray<FieldError>,
): DashboardServiceError {
  return new DashboardServiceError("VALIDATION", message, fieldErrors);
}

export function createAuthRequiredError(
  message = "Authentication is required to access dashboard.",
): DashboardServiceError {
  return new DashboardServiceError("AUTH_REQUIRED", message);
}

export function createDatabaseError(
  message = "An unexpected error occurred while loading dashboard data.",
): DashboardServiceError {
  return new DashboardServiceError("DATABASE_ERROR", message);
}
