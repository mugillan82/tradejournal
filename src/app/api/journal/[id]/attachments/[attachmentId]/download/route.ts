/**
 * Journal Attachment Download Route
 *
 * GET /api/journal/[id]/attachments/[attachmentId]/download
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleAttachmentApiError } from "@/app/api/trades/[id]/attachments/handler";
import { getJournalAttachmentContent } from "@/lib/trading/attachment/service";
import { requireServerUserId } from "@/lib/auth/session";

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id: string; attachmentId: string }>
      | { id: string; attachmentId: string };
  },
): Promise<NextResponse<unknown>> {
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
    const { id, attachmentId } = await params;
    const { attachment, data, contentType } = await getJournalAttachmentContent(id, attachmentId);

    const cleanFileName = attachment.fileName.replace(/["\r\n\\]/g, "_");

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": contentType || attachment.mimeType || "application/octet-stream",
        "Content-Length": data.length.toString(),
        "Content-Disposition": `inline; filename="${cleanFileName}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleAttachmentApiError(err);
  }
}
