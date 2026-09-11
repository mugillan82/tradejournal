/**
 * Classification Domain — Service Errors
 *
 * Domain-typed errors for Tag, Strategy, Setup, Mistake, and Trade Association operations.
 */

export type ClassificationServiceErrorCode =
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

export class ClassificationServiceError extends Error {
  public readonly code: ClassificationServiceErrorCode;
  public readonly httpStatus: number;
  public readonly fieldErrors: ReadonlyArray<FieldError>;

  constructor(params: {
    code: ClassificationServiceErrorCode;
    message: string;
    httpStatus: number;
    fieldErrors?: ReadonlyArray<FieldError>;
  }) {
    super(params.message);
    this.name = "ClassificationServiceError";
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

  get isConflictError(): boolean {
    return this.code === "CONFLICT";
  }
}

export function createValidationError(
  fieldErrors: ReadonlyArray<FieldError>,
): ClassificationServiceError {
  return new ClassificationServiceError({
    code: "VALIDATION",
    message:
      fieldErrors.length === 1
        ? fieldErrors[0].message
        : `${fieldErrors.length} validation error(s)`,
    httpStatus: 400,
    fieldErrors,
  });
}

export function createAuthRequiredError(): ClassificationServiceError {
  return new ClassificationServiceError({
    code: "AUTH_REQUIRED",
    message: "Authentication required",
    httpStatus: 401,
  });
}

export function createNotFoundError(resource = "Resource"): ClassificationServiceError {
  return new ClassificationServiceError({
    code: "NOT_FOUND",
    message: `${resource} not found or not accessible`,
    httpStatus: 404,
  });
}

export function createConflictError(message: string): ClassificationServiceError {
  return new ClassificationServiceError({
    code: "CONFLICT",
    message,
    httpStatus: 409,
  });
}

export function createDatabaseError(err: unknown): ClassificationServiceError {
  console.error("[ClassificationService] Database error:", err);
  return new ClassificationServiceError({
    code: "DATABASE_ERROR",
    message: "An unexpected database error occurred. Please try again later.",
    httpStatus: 500,
  });
}
