/**
 * Individual Trade Note API Route
 *
 * PATCH /api/trades/[id]/notes/[noteId] — Update note
 * DELETE /api/trades/[id]/notes/[noteId] — Delete note
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleJournalApiError } from "@/app/api/journal/handler";
import {
  updateTradeNote,
  deleteTradeNote,
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

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id: string; noteId: string }>
      | { id: string; noteId: string };
  },
): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  let body: { content?: string };
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
    const { id, noteId } = await params;
    const note = await updateTradeNote(id, noteId, {
      content: body.content ?? "",
    });
    return NextResponse.json(note, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleJournalApiError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id: string; noteId: string }>
      | { id: string; noteId: string };
  },
): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    const { id, noteId } = await params;
    await deleteTradeNote(id, noteId);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleJournalApiError(err);
  }
}
