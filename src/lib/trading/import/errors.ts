/**
 * Import Domain — Errors
 *
 * Defines stable error classes for the import pipeline.
 */

export type ImportErrorCode =
  | "UNSUPPORTED_SOURCE"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE"
  | "INTERNAL_ERROR";

export class ImportError extends Error {
  public readonly code: ImportErrorCode;
  public readonly originalError?: unknown;

  constructor(code: ImportErrorCode, message: string, originalError?: unknown) {
    super(message);
    this.name = "ImportError";
    this.code = code;
    this.originalError = originalError;
  }
}

export function createUnsupportedSourceError(source: string): ImportError {
  return new ImportError(
    "UNSUPPORTED_SOURCE",
    `The import source '${source}' is not supported yet.`
  );
}

export function createParseError(message: string, originalError?: unknown): ImportError {
  return new ImportError("PARSE_ERROR", message, originalError);
}

export function createValidationError(message: string): ImportError {
  return new ImportError("VALIDATION_ERROR", message);
}

export function createFileTooLargeError(maxSizeMb: number): ImportError {
  return new ImportError("FILE_TOO_LARGE", `File size exceeds the limit of ${maxSizeMb} MB.`);
}

export function createInvalidFileTypeError(allowedTypes: string[]): ImportError {
  return new ImportError(
    "INVALID_FILE_TYPE",
    `Invalid file type. Allowed types: ${allowedTypes.join(", ")}.`
  );
}

export function createInternalError(originalError?: unknown): ImportError {
  return new ImportError("INTERNAL_ERROR", "An unexpected internal error occurred.", originalError);
}
