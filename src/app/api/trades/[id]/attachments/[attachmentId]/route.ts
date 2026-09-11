/**
 * Trade Attachment API — Individual Attachment Delete Route
 *
 * DELETE /api/trades/[id]/attachments/[attachmentId] — Delete an attachment
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { handleAttachmentApiError } from "../handler";
import { deleteTradeAttachment } from "@/lib/trading/attachment/service";
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
// DELETE /api/trades/[id]/attachments/[attachmentId] — Delete attachment
// ---------------------------------------------------------------------------

export async function DELETE(
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
    await deleteTradeAttachment(id, attachmentId);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleAttachmentApiError(err);
  }
}
