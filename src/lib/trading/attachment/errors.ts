/**
 * Attachment Domain — Service Errors
 *
 * Domain-typed errors for attachment operations.
 * Raw database and filesystem errors are never leaked to callers.
 */

export type AttachmentServiceErrorCode =
  | "VALIDATION"
  | "AUTH_REQUIRED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "STORAGE_ERROR"
  | "DATABASE_ERROR";

export interface FieldError {
  readonly path: string;
  readonly message: string;
}

export class AttachmentServiceError extends Error {
  public readonly code: AttachmentServiceErrorCode;
  public readonly httpStatus: number;
  public readonly fieldErrors: ReadonlyArray<FieldError>;

  constructor(params: {
    code: AttachmentServiceErrorCode;
    message: string;
    httpStatus: number;
    fieldErrors?: ReadonlyArray<FieldError>;
  }) {
    super(params.message);
    this.name = "AttachmentServiceError";
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
}

export function createValidationError(
  fieldErrors: ReadonlyArray<FieldError>,
): AttachmentServiceError {
  return new AttachmentServiceError({
    code: "VALIDATION",
    message:
      fieldErrors.length === 1
        ? fieldErrors[0].message
        : `${fieldErrors.length} validation error(s)`,
    httpStatus: 400,
    fieldErrors,
  });
}

export function createAuthRequiredError(): AttachmentServiceError {
  return new AttachmentServiceError({
    code: "AUTH_REQUIRED",
    message: "Authentication required",
    httpStatus: 401,
  });
}

export function createNotFoundError(resource = "Attachment"): AttachmentServiceError {
  return new AttachmentServiceError({
    code: "NOT_FOUND",
    message: `${resource} not found or not accessible`,
    httpStatus: 404,
  });
}

export function createForbiddenError(): AttachmentServiceError {
  return new AttachmentServiceError({
    code: "FORBIDDEN",
    message: "You do not have permission to access this resource",
    httpStatus: 403,
  });
}

export function createStorageError(err: unknown): AttachmentServiceError {
  console.error("[AttachmentService] Storage error:", err);
  return new AttachmentServiceError({
    code: "STORAGE_ERROR",
    message: "An error occurred while saving the file. Please try again.",
    httpStatus: 500,
  });
}

export function createDatabaseError(err: unknown): AttachmentServiceError {
  console.error("[AttachmentService] Database error:", err);
  return new AttachmentServiceError({
    code: "DATABASE_ERROR",
    message: "An unexpected database error occurred. Please try again later.",
    httpStatus: 500,
  });
}
