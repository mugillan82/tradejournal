/**
 * Analytics API — Error Handler
 *
 * Converts AnalyticsServiceError exceptions into structured JSON HTTP responses.
 */

import type { AnalyticsServiceError } from "@/lib/trading/analytics/errors";
import { NextResponse } from "next/server";

export function handleAnalyticsApiError(err: unknown): NextResponse<unknown> {
  if (err instanceof Error && err.name === "AnalyticsServiceError") {
    const svcErr = err as AnalyticsServiceError;
    return NextResponse.json(
      {
        error: {
          code: svcErr.code,
          message: svcErr.message,
          fieldErrors: svcErr.fieldErrors,
        },
      },
      {
        status: svcErr.httpStatus,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  // Unexpected errors — return a generic 500 without leaking database/internal details
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An internal error occurred. Please try again later.",
        fieldErrors: [],
      },
    },
    {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
