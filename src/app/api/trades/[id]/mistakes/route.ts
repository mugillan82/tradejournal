/**
 * Trade Mistakes Association API
 *
 * GET /api/trades/[id]/mistakes — Get mistakes for trade
 * PUT /api/trades/[id]/mistakes — Replace all mistakes on trade
 * POST /api/trades/[id]/mistakes — Add a single mistake to trade
 * DELETE /api/trades/[id]/mistakes — Remove a single mistake from trade
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleClassificationApiError } from "@/app/api/classification-handler";
import {
  getTradeClassifications,
  setTradeMistakes,
  addTradeMistake,
  removeTradeMistake,
} from "@/lib/trading/classification/service";
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    const summary = await getTradeClassifications(id);
    return NextResponse.json(summary.mistakes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleClassificationApiError(err);
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
    const mistakes = await setTradeMistakes(id, body as Parameters<typeof setTradeMistakes>[1]);
    return NextResponse.json(mistakes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleClassificationApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  let body: { mistakeId?: string };
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
    const mistake = await addTradeMistake(id, body.mistakeId ?? "");
    return NextResponse.json(mistake, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleClassificationApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const mistakeId = searchParams.get("mistakeId");

  if (!mistakeId) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "mistakeId query parameter is required",
          fieldErrors: [{ path: "mistakeId", message: "mistakeId query parameter is required" }],
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { id } = await params;
    await removeTradeMistake(id, mistakeId);
    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleClassificationApiError(err);
  }
}
