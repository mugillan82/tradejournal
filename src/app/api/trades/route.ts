/**
 * Trade API — Trades List Route
 *
 * Handles:
 * - POST /api/trades — Create a new trade
 * - GET /api/trades — List trades with filters, sort, pagination
 *
 * Authentication: requires a valid Better Auth session (server-side).
 * Authorization: user can only access their own trades.
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { handleTradeApiError } from "./handler";
import {
  createTrade,
  listTrades,
} from "@/lib/trading/trade/service";
import type { TradeListFilters, TradeListSort } from "@/lib/trading/trade/types";
import { requireServerUserId } from "@/lib/auth/session";


// ---------------------------------------------------------------------------
// POST /api/trades — Create a new trade
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse<unknown>> {
  // Route-level authentication
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
    const trade = await createTrade(body as Parameters<typeof createTrade>[0]);
    return NextResponse.json(trade, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleTradeApiError(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/trades — List trades with filters, sort, pagination
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse<unknown>> {
  // Route-level authentication
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

    // --- filters ---
    const ids = searchParams.get("ids");
    const tradingAccountId = searchParams.get("tradingAccountId");
    const side = searchParams.get("side");
    const status = searchParams.get("status");
    const entryDateFrom = searchParams.get("entryDateFrom");
    const entryDateTo = searchParams.get("entryDateTo");
    const exitDateFrom = searchParams.get("exitDateFrom");
    const exitDateTo = searchParams.get("exitDateTo");
    const search = searchParams.get("search");

    const filters: {
      ids?: string[];
      tradingAccountId?: string;
      side?: TradeListFilters["side"];
      status?: TradeListFilters["status"];
      entryDateFrom?: Date;
      entryDateTo?: Date;
      exitDateFrom?: Date;
      exitDateTo?: Date;
      search?: string;
    } = {};

    if (ids) {
      filters.ids = ids.split(",").map((id) => id.trim());
    }
    if (tradingAccountId) {
      filters.tradingAccountId = tradingAccountId;
    }
    if (side) {
      filters.side = side as TradeListFilters["side"];
    }
    if (status) {
      const statusValues = status.split(",").map((s) => s.trim());
      filters.status =
        statusValues.length === 1
          ? (statusValues[0] as TradeListFilters["status"])
          : (statusValues as TradeListFilters["status"]);
    }
    if (entryDateFrom) {
      filters.entryDateFrom = new Date(entryDateFrom);
    }
    if (entryDateTo) {
      filters.entryDateTo = new Date(entryDateTo);
    }
    if (exitDateFrom) {
      filters.exitDateFrom = new Date(exitDateFrom);
    }
    if (exitDateTo) {
      filters.exitDateTo = new Date(exitDateTo);
    }
    if (search) {
      filters.search = search;
    }

    // --- sort ---
    const sortField = searchParams.get("sortField") ?? "entryDate";
    const sortDirection = searchParams.get("sortDirection") ?? "desc";
    const sort: TradeListSort = {
      field: sortField as TradeListSort["field"],
      direction: sortDirection as "asc" | "desc",
    };

    // --- pagination ---
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    };

    const result = await listTrades({ filters, sort, pagination });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleTradeApiError(err);
  }
}


