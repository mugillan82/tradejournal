/**
 * Mistakes API — Detail, Update & Delete Route
 *
 * GET /api/mistakes/[id] — Get mistake by ID
 * PATCH /api/mistakes/[id] — Update mistake
 * DELETE /api/mistakes/[id] — Delete mistake
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleClassificationApiError } from "@/app/api/classification-handler";
import {
  getMistakeById,
  updateMistake,
  deleteMistake,
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
    const mistake = await getMistakeById(id);
    return NextResponse.json(mistake, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleClassificationApiError(err);
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
    const updated = await updateMistake(id, body as Parameters<typeof updateMistake>[1]);
    return NextResponse.json(updated, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleClassificationApiError(err);
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
    await deleteMistake(id);
    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleClassificationApiError(err);
  }
}
