export class DataManagementServiceError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string = "DATA_MANAGEMENT_ERROR", status: number = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "DataManagementServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidExportParametersError extends DataManagementServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "INVALID_EXPORT_PARAMETERS", 400, details);
    this.name = "InvalidExportParametersError";
  }
}

export class UnsupportedExportFormatError extends DataManagementServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "UNSUPPORTED_EXPORT_FORMAT", 400, details);
    this.name = "UnsupportedExportFormatError";
  }
}

export class ExportUnauthorizedError extends DataManagementServiceError {
  constructor(message: string = "Unauthorized export request") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "ExportUnauthorizedError";
  }
}
