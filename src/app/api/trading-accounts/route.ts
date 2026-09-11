/**
 * Trading Account API — Collection Route
 *
 * Handles:
 * - POST /api/trading-accounts — Create a new trading account
 * - GET /api/trading-accounts — List trading accounts with filters, sort, pagination
 *
 * Authentication: requires a valid Better Auth session (server-side).
 * Authorization: user can only access their own trading accounts.
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { handleTradingAccountApiError } from "./handler";
import {
  createTradingAccount,
  listTradingAccounts,
} from "@/lib/trading/account/service";
import type {
  TradingAccountListSort,
} from "@/lib/trading/account/types";
import { requireServerUserId } from "@/lib/auth/session";

// ---------------------------------------------------------------------------
// POST /api/trading-accounts — Create a new trading account
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse<unknown>> {
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
    const account = await createTradingAccount(body as Parameters<typeof createTradingAccount>[0]);
    return NextResponse.json(account, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleTradingAccountApiError(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/trading-accounts — List trading accounts
// ---------------------------------------------------------------------------

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

    // --- filters ---
    const ids = searchParams.get("ids");
    const isActiveParam = searchParams.get("isActive");
    const currency = searchParams.get("currency");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const filters: {
      ids?: string[];
      isActive?: boolean;
      currency?: string;
      type?: string;
      search?: string;
    } = {};

    if (ids) {
      filters.ids = ids.split(",").map((id) => id.trim());
    }
    if (isActiveParam !== null) {
      if (isActiveParam === "true") filters.isActive = true;
      else if (isActiveParam === "false") filters.isActive = false;
    }
    if (currency) {
      filters.currency = currency;
    }
    if (type) {
      filters.type = type;
    }
    if (search) {
      filters.search = search;
    }

    // --- sort ---
    const sortField = searchParams.get("sortField") ?? "createdAt";
    const sortDirection = searchParams.get("sortDirection") ?? "desc";
    const sort: TradingAccountListSort = {
      field: sortField as TradingAccountListSort["field"],
      direction: sortDirection as "asc" | "desc",
    };

    // --- pagination ---
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");

    let page = 1;
    if (pageParam !== null) {
      const parsedPage = parseInt(pageParam, 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION",
              message: "page must be a positive integer",
              fieldErrors: [{ path: "page", message: "page must be a positive integer" }],
            },
          },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      page = parsedPage;
    }

    let pageSize = 50;
    if (pageSizeParam !== null) {
      const parsedSize = parseInt(pageSizeParam, 10);
      if (isNaN(parsedSize) || parsedSize < 1) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION",
              message: "pageSize must be a positive integer",
              fieldErrors: [{ path: "pageSize", message: "pageSize must be a positive integer" }],
            },
          },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      pageSize = parsedSize;
    }

    const result = await listTradingAccounts({
      filters,
      sort,
      pagination: { page, pageSize },
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleTradingAccountApiError(err);
  }
}
