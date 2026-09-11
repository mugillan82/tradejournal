/**
 * Trade API — Error Handler
 *
 * Converts TradeServiceError exceptions from the trade service
 * into structured JSON HTTP responses for API route handlers.
 *
 * Usage in route handlers:
 * ```ts
 * try {
 *   const result = await createTrade(input);
 *   return NextResponse.json(result, { status: 201 });
 * } catch (err) {
 *   return handleTradeApiError(err);
 * }
 * ```
 */

import type { TradeServiceError } from "@/lib/trading/trade/errors";
import { NextResponse } from "next/server";

export function handleTradeApiError(err: unknown): NextResponse<unknown> {
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

