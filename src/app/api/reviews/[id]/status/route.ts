/**
 * Review Status Workflow Transition API Route
 *
 * PATCH /api/reviews/[id]/status
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleJournalApiError } from "@/app/api/journal/handler";
import { updateReviewStatus } from "@/lib/trading/journal/service";
import type { ReviewStatusValue } from "@/lib/trading/journal/types";
import { requireServerUserId } from "@/lib/auth/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
): Promise<NextResponse<unknown>> {
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

  let body: { status?: ReviewStatusValue };
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

  if (!body.status) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "status is required",
          fieldErrors: [{ path: "status", message: "status is required" }],
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { id } = await params;
    const review = await updateReviewStatus(id, body.status);
    return NextResponse.json(review, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleJournalApiError(err);
  }
}
