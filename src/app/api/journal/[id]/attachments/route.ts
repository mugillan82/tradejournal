/**
 * Journal Attachments API — List & Upload Route
 *
 * GET /api/journal/[id]/attachments — List attachments for journal entry
 * POST /api/journal/[id]/attachments — Upload new attachment for journal entry
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleAttachmentApiError } from "@/app/api/trades/[id]/attachments/handler";
import {
  listJournalAttachments,
  uploadJournalAttachment,
} from "@/lib/trading/attachment/service";
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
    const attachments = await listJournalAttachments(id);
    return NextResponse.json(attachments, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleAttachmentApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
): Promise<NextResponse<unknown>> {
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Request must be multipart/form-data with a 'file' field",
            fieldErrors: [{ field: "file", message: "File payload is required" }],
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const file = formData.get("file");
    if (!file || typeof file === "string" || !(file instanceof Blob)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Attachment file is required",
            fieldErrors: [{ field: "file", message: "File field must contain a valid file" }],
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = (file as File).name || "attachment";
    const mimeType = file.type || "application/octet-stream";

    const attachment = await uploadJournalAttachment(id, {
      fileName,
      mimeType,
      buffer,
    });

    return NextResponse.json(attachment, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleAttachmentApiError(err);
  }
}
