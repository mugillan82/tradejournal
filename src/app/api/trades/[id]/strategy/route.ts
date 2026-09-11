/**
 * Trade Strategy Association API
 *
 * PUT /api/trades/[id]/strategy — Assign or clear strategy on trade
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleClassificationApiError } from "@/app/api/classification-handler";
import { assignTradeStrategy } from "@/lib/trading/classification/service";
import { requireServerUserId } from "@/lib/auth/session";

async function authenticateRequest(): Promise<NextResponse<unknown> | null> {
  try {
    await requireServerUserId();
    return null;
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
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
): Promise<NextResponse<unknown>> {
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
    const { id } = await params;
    const strategy = await assignTradeStrategy(id, body as Parameters<typeof assignTradeStrategy>[1]);
    return NextResponse.json({ strategy }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleClassificationApiError(err);
  }
}
