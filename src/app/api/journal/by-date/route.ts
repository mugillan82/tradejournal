/**
 * Journal Entry by Date API Route
 *
 * GET /api/journal/by-date?date=YYYY-MM-DD
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleJournalApiError } from "../handler";
import { getJournalEntryByDate } from "@/lib/trading/journal/service";
import { requireServerUserId } from "@/lib/auth/session";

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
    const dateStr = searchParams.get("date");
    if (!dateStr) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "date query parameter is required (YYYY-MM-DD)",
            fieldErrors: [{ path: "date", message: "date is required" }],
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const entry = await getJournalEntryByDate(dateStr);
    return NextResponse.json(entry, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleJournalApiError(err);
  }
}
