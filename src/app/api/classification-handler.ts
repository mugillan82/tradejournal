/**
 * Classification API — Error Handler
 *
 * Converts ClassificationServiceError exceptions into structured JSON HTTP responses.
 */

import type { ClassificationServiceError } from "@/lib/trading/classification/errors";
import { NextResponse } from "next/server";

export function handleClassificationApiError(err: unknown): NextResponse<unknown> {
  if (err instanceof Error && err.name === "ClassificationServiceError") {
    const svcErr = err as ClassificationServiceError;
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
