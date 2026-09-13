/**
 * Notebook Notes API — List & Create Route
 *
 * GET /api/notebook — List notebook notes
 * POST /api/notebook — Create new notebook note
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleJournalApiError } from "../journal/handler";
import {
  listNotebookNotes,
  createNotebookNote,
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

export async function GET(request: NextRequest): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const strategyId = searchParams.get("strategyId") || undefined;
    const setupId = searchParams.get("setupId") || undefined;
    const tagId = searchParams.get("tagId") || undefined;
    const isArchivedStr = searchParams.get("isArchived");
    const isArchived = isArchivedStr !== null ? isArchivedStr === "true" : undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const result = await listNotebookNotes(
      {
        search,
        strategyId,
        setupId,
        tagId,
        isArchived,
      },
      { page, pageSize },
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleJournalApiError(err);
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
    const note = await createNotebookNote(body as Parameters<typeof createNotebookNote>[0]);
    return NextResponse.json(note, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleJournalApiError(err);
  }
}
