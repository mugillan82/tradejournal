/**
 * Trade API — Individual Trade Route
 *
 * Handles:
 * - GET /api/trades/[id] — Get a trade by ID
 * - PATCH /api/trades/[id] — Update a trade
 * - DELETE /api/trades/[id] — Delete a trade
 *
 * Authentication: requires a valid Better Auth session (server-side).
 * Authorization: user can only access their own trades.
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { handleTradeApiError } from "../handler";
import {
  getTradeById,
  updateTrade,
  deleteTrade,
} from "@/lib/trading/trade/service";
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

// ---------------------------------------------------------------------------
// GET /api/trades/[id] — Get a trade by ID
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    const trade = await getTradeById(params.id);
    return NextResponse.json(trade, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleTradeApiError(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/trades/[id] — Update a trade
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
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
    const trade = await updateTrade(params.id, body as Parameters<typeof updateTrade>[1]);
    return NextResponse.json(trade, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleTradeApiError(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/trades/[id] — Delete a trade
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    await deleteTrade(params.id);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleTradeApiError(err);
  }
}


