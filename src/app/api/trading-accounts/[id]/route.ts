/**
 * Trading Account API — Individual Account Route
 *
 * Handles:
 * - GET /api/trading-accounts/[id] — Get a trading account by ID
 * - PATCH /api/trading-accounts/[id] — Update a trading account
 * - DELETE /api/trading-accounts/[id] — Delete a trading account
 *
 * Authentication: requires a valid Better Auth session (server-side).
 * Authorization: user can only access their own trading accounts.
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { handleTradingAccountApiError } from "../handler";
import {
  getTradingAccountById,
  updateTradingAccount,
  deleteTradingAccount,
} from "@/lib/trading/account/service";
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
// GET /api/trading-accounts/[id] — Get a trading account by ID
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    const account = await getTradingAccountById(params.id);
    return NextResponse.json(account, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleTradingAccountApiError(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/trading-accounts/[id] — Update a trading account
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
    const account = await updateTradingAccount(
      params.id,
      body as Parameters<typeof updateTradingAccount>[1],
    );
    return NextResponse.json(account, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleTradingAccountApiError(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/trading-accounts/[id] — Delete a trading account
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    await deleteTradingAccount(params.id);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleTradingAccountApiError(err);
  }
}
