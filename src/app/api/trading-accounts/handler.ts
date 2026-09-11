/**
 * Trading Account API — Error Handler
 *
 * Converts TradeServiceError exceptions into structured JSON HTTP responses
 * for Trading Account API route handlers.
 */

import type { TradeServiceError } from "@/lib/trading/trade/errors";
import { NextResponse } from "next/server";

export function handleTradingAccountApiError(err: unknown): NextResponse<unknown> {
  if (err instanceof Error && err.name === "TradeServiceError") {
    const svcErr = err as TradeServiceError;
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

  // Unexpected errors — return generic 500 without leaking internal details
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
