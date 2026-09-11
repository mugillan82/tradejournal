/**
 * Trade Attachment API — Error Handler
 *
 * Converts AttachmentServiceError exceptions from the attachment service
 * into structured JSON HTTP responses for API route handlers.
 */

import type { AttachmentServiceError } from "@/lib/trading/attachment/errors";
import { NextResponse } from "next/server";

export function handleAttachmentApiError(err: unknown): NextResponse<unknown> {
  if (err instanceof Error && err.name === "AttachmentServiceError") {
    const svcErr = err as AttachmentServiceError;
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

  // Unexpected errors — return a generic 500 without leaking details
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
