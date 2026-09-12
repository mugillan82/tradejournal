import { NextResponse } from "next/server";
import {
  DataManagementServiceError,
  ExportUnauthorizedError,
  InvalidExportParametersError,
  UnsupportedExportFormatError,
} from "@/lib/trading/data-management/errors";

export function handleDataManagementApiError(error: unknown): NextResponse {
  if (error instanceof ExportUnauthorizedError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      {
        status: error.status,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  if (error instanceof InvalidExportParametersError || error instanceof UnsupportedExportFormatError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      {
        status: error.status,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  if (error instanceof DataManagementServiceError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      {
        status: error.status,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  // Generic sanitized fallback
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred during data management operation",
      },
    },
    {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
