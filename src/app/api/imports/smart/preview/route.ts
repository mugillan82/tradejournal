import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { getTradingAccountById } from "@/lib/trading/account/service";
import { processScreenshot } from "@/lib/trading/smart-import/service";
import { validateImage } from "@/lib/trading/smart-import/image-validation";
import { listTrades } from "@/lib/trading/trade/service";
import { detectDuplicate } from "@/lib/trading/import/duplicate";
import type { TradeDto } from "@/lib/trading/trade/types";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireServerUserId();

    // Parse multipart form data
    const formData = await req.formData();
    const accountId = formData.get("tradingAccountId");
    const file = formData.get("screenshot") as File | null;

    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json({ error: "Missing or invalid tradingAccountId" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "Missing screenshot file" }, { status: 400 });
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported image format. Use PNG, JPEG, or WebP." },
        { status: 400 }
      );
    }

    // Verify account ownership
    const account = await getTradingAccountById(accountId);
    if (!account || account.userId !== userId) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Account not found or access denied" },
        { status: 404 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate size, magic bytes signature, and explicit dimensions before OCR
    const imageValidation = validateImage(buffer);
    if (!imageValidation.isValid) {
      return NextResponse.json({ error: imageValidation.error }, { status: 400 });
    }

    // Process screenshot via Smart Import pipeline
    const result = await processScreenshot(buffer, file.type, account.id);

    // If no candidates extracted, return early
    if (result.candidates.length === 0) {
      return NextResponse.json(
        {
          success: true,
          sourceDetection: result.sourceDetection,
          preview: {
            candidates: [],
            duplicateCount: 0,
            errorCount: 0,
            readyCount: 0,
          },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Run duplicate detection for Smart Import against existing account trades
    const recentTradesResult = await listTrades({
      filters: { tradingAccountId: account.id },
      pagination: { page: 1, pageSize: 5000 },
      sort: { field: "entryDate", direction: "desc" },
    });
    const existingTrades = recentTradesResult.items as TradeDto[];

    let validCount = 0;
    let invalidCount = 0;
    let exactDupCount = 0;
    let possibleDupCount = 0;

    for (let i = 0; i < result.candidates.length; i++) {
      const candidate = result.candidates[i];
      const sameBatchCandidates = result.candidates.slice(0, i);
      const duplicateMatch = detectDuplicate(candidate, existingTrades, sameBatchCandidates);
      candidate.duplicateMatch = duplicateMatch;

      if (candidate.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
      if (duplicateMatch.classification === "EXACT") exactDupCount++;
      if (duplicateMatch.classification === "POSSIBLE") possibleDupCount++;
    }

    const preview = {
      candidates: result.candidates,
      duplicateCount: exactDupCount + possibleDupCount,
      errorCount: invalidCount,
      readyCount: validCount - exactDupCount,
    };

    return NextResponse.json(
      {
        success: true,
        sourceDetection: result.sourceDetection,
        preview,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process screenshot";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    console.error("Smart Import Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message }, { status: 500 });
  }
}
