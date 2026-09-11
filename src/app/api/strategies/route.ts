/**
 * Strategies API — List & Create Route
 *
 * GET /api/strategies — List strategies
 * POST /api/strategies — Create strategy
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleClassificationApiError } from "@/app/api/classification-handler";
import { listStrategies, createStrategy } from "@/lib/trading/classification/service";
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

export async function GET(): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    const strategies = await listStrategies();
    return NextResponse.json(strategies, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleClassificationApiError(err);
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
    const strategy = await createStrategy(body as Parameters<typeof createStrategy>[0]);
    return NextResponse.json(strategy, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleClassificationApiError(err);
  }
}
