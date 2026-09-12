/**
 * Analytics API — Overview Route
 *
 * GET /api/analytics/overview
 *
 * Requirements:
 * - Authenticated user only.
 * - User isolation enforced via server session.
 * - Typed query parsing and validation.
 * - Cache-Control: no-store.
 * - Sanitized errors.
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { getAnalyticsOverview } from "@/lib/trading/analytics/service";
import type { AnalyticsFilterInput } from "@/lib/trading/analytics/types";
import { handleAnalyticsApiError } from "../handler";

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

    const overview = await getAnalyticsOverview(
      filter as AnalyticsFilterInput,
      userId,
    );

    return NextResponse.json(overview, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleAnalyticsApiError(err);
  }
}
