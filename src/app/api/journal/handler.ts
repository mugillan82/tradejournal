/**
 * Journal API — Error Handler
 *
 * Converts JournalServiceError exceptions from the journal service
 * into structured JSON HTTP responses for API route handlers.
 */

import type { JournalServiceError } from "@/lib/trading/journal/errors";
import { NextResponse } from "next/server";

export function handleJournalApiError(err: unknown): NextResponse<unknown> {
  if (err instanceof Error && err.name === "JournalServiceError") {
    const svcErr = err as JournalServiceError;
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
