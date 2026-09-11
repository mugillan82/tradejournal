/**
 * Trade Attachment API — Download / View Route
 *
 * GET /api/trades/[id]/attachments/[attachmentId]/download — Download/stream attachment file
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleAttachmentApiError } from "../../handler";
import { getTradeAttachmentContent } from "@/lib/trading/attachment/service";
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

// ---------------------------------------------------------------------------
// GET /api/trades/[id]/attachments/[attachmentId]/download — Download file
// ---------------------------------------------------------------------------

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
  const authResponse = await authenticateRequest();
  if (authResponse) return authResponse;

  try {
    const { id, attachmentId } = await params;
    const { attachment, data, contentType } = await getTradeAttachmentContent(id, attachmentId);

    // Sanitize filename for content-disposition header
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
