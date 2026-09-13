/**
 * Trade Reviews API — List & Create Route
 *
 * GET /api/reviews — List reviews
 * POST /api/reviews — Create review
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleJournalApiError } from "@/app/api/journal/handler";
import {
  listReviews,
  createReview,
} from "@/lib/trading/journal/service";
import type { ReviewStatusValue } from "@/lib/trading/journal/types";
import { requireServerUserId } from "@/lib/auth/session";

async function authenticateRequest(): Promise<NextResponse<unknown> | null> {
  try {
    await requireServerUserId();
    return null;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required to access reviews",
        },
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const fromDateStr = searchParams.get("fromDate");
    const toDateStr = searchParams.get("toDate");
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as ReviewStatusValue) || undefined;
    const ratingStr = searchParams.get("rating");
    const rating = ratingStr ? parseInt(ratingStr, 10) : undefined;
    const tagId = searchParams.get("tagId") || undefined;
    const mistakeId = searchParams.get("mistakeId") || undefined;
    const tradeId = searchParams.get("tradeId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const result = await listReviews(
      {
        fromDate: fromDateStr ? new Date(fromDateStr) : undefined,
        toDate: toDateStr ? new Date(toDateStr) : undefined,
        search,
        status,
        rating,
        tagId,
        mistakeId,
        tradeId,
      },
      { page, pageSize },
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleJournalApiError(err);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "Request body must be valid JSON",
          fieldErrors: [],
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const review = await createReview(body as Parameters<typeof createReview>[0]);
    return NextResponse.json(review, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleJournalApiError(err);
  }
}
