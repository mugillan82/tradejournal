/**
 * Individual Review Template API Route
 *
 * GET /api/review-templates/[id] — Get template
 * PATCH /api/review-templates/[id] — Update template (user-owned only)
 * DELETE /api/review-templates/[id] — Delete template (user-owned only)
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleJournalApiError } from "@/app/api/journal/handler";
import {
  getReviewTemplateById,
  updateReviewTemplate,
  deleteReviewTemplate,
} from "@/lib/trading/journal/service";
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
    const template = await getReviewTemplateById(id);
    return NextResponse.json(template, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleJournalApiError(err);
  }
}

export async function PATCH(
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
    const template = await updateReviewTemplate(id, body as Parameters<typeof updateReviewTemplate>[1]);
    return NextResponse.json(template, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleJournalApiError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    await deleteReviewTemplate(id);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleJournalApiError(err);
  }
}
