/**
 * AI API — Review Analysis Route
 *
 * POST /api/ai/analyze-review
 *
 * Requirements:
 * - Authenticated user only (server session isolation).
 * - Explicit user-triggered action.
 * - Guarantees review ownership.
 * - Rate limiting (429).
 * - Cache-Control: no-store, private.
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { analyzeReview } from "@/lib/trading/ai/service";

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
          message: "Authentication required to analyze trade review.",
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

  const reviewId = typeof body.reviewId === "string" ? body.reviewId.trim() : null;
  if (!reviewId) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "A valid reviewId is required.",
        },
      },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const result = await analyzeReview(userId, reviewId);

    return NextResponse.json(result, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to analyze review.";

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

    if (message.includes("not found") || message.includes("unauthorized")) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Review not found or unauthorized.",
          },
        },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "ANALYSIS_FAILED",
          message: "Unable to analyze review at this time.",
        },
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to analyze review." } },
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
