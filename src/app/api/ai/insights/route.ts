/**
 * AI API — Trade Insights Route
 *
 * POST /api/ai/insights
 *
 * Requirements:
 * - Authenticated user only (server session isolation).
 * - Explicit user-triggered action (never called automatically on load).
 * - Bounded input filters.
 * - Rate limiting (429).
 * - Cache-Control: no-store, private.
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { generateTradeInsights } from "@/lib/trading/ai/service";
import type { AnalyticsFilterInput } from "@/lib/trading/analytics/types";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  "Content-Type": "application/json",
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireServerUserId();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "AUTH_REQUIRED",
          message: "Authentication required to generate AI insights.",
        },
      },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text && text.trim()) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Invalid JSON request body.",
        },
      },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  // Parse and sanitize filter properties
  const filter: Record<string, unknown> = {};

  const fromVal = body.dateFrom || body.fromDate;
  if (typeof fromVal === "string" && fromVal.trim()) {
    const d = new Date(fromVal);
    if (!isNaN(d.getTime())) filter.dateFrom = d;
  }
  const toVal = body.dateTo || body.toDate;
  if (typeof toVal === "string" && toVal.trim()) {
    const d = new Date(toVal);
    if (!isNaN(d.getTime())) filter.dateTo = d;
  }
  if (typeof body.tradingAccountId === "string" && body.tradingAccountId.trim()) {
    filter.tradingAccountId = body.tradingAccountId.trim();
  }
  if (typeof body.symbol === "string" && body.symbol.trim()) {
    filter.symbol = body.symbol.trim().toUpperCase();
  }
  if (body.side === "LONG" || body.side === "SHORT") {
    filter.side = body.side;
  }
  if (typeof body.strategyId === "string" && body.strategyId.trim()) {
    filter.strategyId = body.strategyId.trim();
  }
  if (typeof body.setupId === "string" && body.setupId.trim()) {
    filter.setupId = body.setupId.trim();
  }
  if (typeof body.tagId === "string" && body.tagId.trim()) {
    filter.tagId = body.tagId.trim();
  }
  if (typeof body.mistakeId === "string" && body.mistakeId.trim()) {
    filter.mistakeId = body.mistakeId.trim();
  }

  try {
    const result = await generateTradeInsights(userId, filter as AnalyticsFilterInput);

    return NextResponse.json(result, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate AI insights.";

    if (message.includes("Rate limit")) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message,
          },
        },
        { status: 429, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "AI_GENERATION_FAILED",
          message: "Unable to complete AI analysis at this time.",
        },
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to generate insights." } },
    { status: 405, headers: { ...NO_STORE_HEADERS, Allow: "POST" } },
  );
}

export async function PUT(): Promise<NextResponse> {
  return GET();
}

export async function DELETE(): Promise<NextResponse> {
  return GET();
}

export async function PATCH(): Promise<NextResponse> {
  return GET();
}
