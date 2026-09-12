/**
 * Reports API — Overview Route
 *
 * GET /api/reports/overview
 *
 * Requirements:
 * - Authenticated user only.
 * - Session-derived userId for strict user isolation.
 * - Server-side filter validation (reject unknown params).
 * - Cache-Control: no-store.
 * - Sanitized errors.
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { getReportOverview } from "@/lib/trading/reports/service";
import type { ReportFilterInput } from "@/lib/trading/reports/types";
import { ReportServiceError } from "@/lib/trading/reports/errors";

export async function GET(request: NextRequest): Promise<NextResponse<unknown>> {
  let userId: string;
  try {
    userId = await requireServerUserId();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "AUTH_REQUIRED",
          message: "Authentication required",
          fieldErrors: [],
        },
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const filter: Record<string, unknown> = {};

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const tradingAccountId = searchParams.get("tradingAccountId");
    const symbol = searchParams.get("symbol");
    const side = searchParams.get("side");
    const status = searchParams.get("status");
    const strategyId = searchParams.get("strategyId");
    const setupId = searchParams.get("setupId");
    const tagId = searchParams.get("tagId");
    const mistakeId = searchParams.get("mistakeId");

    if (dateFrom) filter.dateFrom = dateFrom;
    if (dateTo) filter.dateTo = dateTo;
    if (tradingAccountId) filter.tradingAccountId = tradingAccountId;
    if (symbol) filter.symbol = symbol;
    if (side) filter.side = side;
    if (status) filter.status = status;
    if (strategyId) filter.strategyId = strategyId;
    if (setupId) filter.setupId = setupId;
    if (tagId) filter.tagId = tagId;
    if (mistakeId) filter.mistakeId = mistakeId;

    const report = await getReportOverview(
      filter as ReportFilterInput,
      userId,
    );

    return NextResponse.json(report, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (err: unknown) {
    if (err instanceof ReportServiceError) {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
            fieldErrors: err.fieldErrors,
          },
        },
        {
          status: err.httpStatus,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while generating the report.",
          fieldErrors: [],
        },
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
