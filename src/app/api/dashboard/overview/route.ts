/**
 * Dashboard API Route — GET /api/dashboard/overview
 *
 * Authenticated endpoint delivering consolidated dashboard overview metrics.
 * Uses session-derived userId with strict user isolation, input validation,
 * and no-store caching headers.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDashboardOverview, DashboardServiceError } from "@/lib/trading/dashboard";
import { requireServerUserId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireServerUserId();

    const { searchParams } = new URL(request.url);
    const tradingAccountId = searchParams.get("tradingAccountId") || undefined;
    const dateFromStr = searchParams.get("dateFrom") || undefined;
    const dateToStr = searchParams.get("dateTo") || undefined;

    const filters = {
      tradingAccountId,
      dateFrom: dateFromStr ? new Date(dateFromStr) : undefined,
      dateTo: dateToStr ? new Date(dateToStr) : undefined,
    };

    const overview = await getDashboardOverview(filters, userId);

    return NextResponse.json(overview, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    if (error instanceof DashboardServiceError) {
      const statusMap: Record<string, number> = {
        VALIDATION: 400,
        AUTH_REQUIRED: 401,
        DATABASE_ERROR: 500,
        UNKNOWN: 500,
      };
      const status = statusMap[error.type] ?? 500;
      return NextResponse.json(
        {
          error: error.message,
          type: error.type,
          fieldErrors: error.fieldErrors,
        },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (error instanceof Error && error.message.toLowerCase().includes("unauthorized")) {
      return NextResponse.json(
        { error: "Authentication required.", type: "AUTH_REQUIRED" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred.", type: "INTERNAL_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
