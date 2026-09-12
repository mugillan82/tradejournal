/**
 * Calendar API — Monthly Performance & Trades Route
 *
 * GET /api/calendar/month?month=YYYY-MM
 *
 * Requirements:
 * - Authenticated user only.
 * - User isolation enforced via server session.
 * - Dimensional filtering (account, symbol, side, status, strategy, setup, tag, mistake).
 * - Cache-Control: no-store.
 * - Sanitized errors without database leakages.
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { getMonthCalendar } from "@/lib/trading/calendar/service";
import type { CalendarFilterInput } from "@/lib/trading/calendar/types";

export async function GET(request: NextRequest): Promise<NextResponse<unknown>> {
  try {
    await requireServerUserId();
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

    const month = searchParams.get("month");
    const tradingAccountId = searchParams.get("tradingAccountId") || undefined;
    const symbol = searchParams.get("symbol") || undefined;
    const side = (searchParams.get("side") as CalendarFilterInput["side"]) || undefined;
    const status = (searchParams.get("status") as CalendarFilterInput["status"]) || undefined;
    const strategyId = searchParams.get("strategyId") || undefined;
    const setupId = searchParams.get("setupId") || undefined;
    const tagId = searchParams.get("tagId") || undefined;
    const mistakeId = searchParams.get("mistakeId") || undefined;

    const filters: CalendarFilterInput = {
      tradingAccountId,
      symbol,
      side,
      status,
      strategyId,
      setupId,
      tagId,
      mistakeId,
    };

    const data = await getMonthCalendar(month, filters);

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An error occurred while loading calendar data.";
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message,
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
