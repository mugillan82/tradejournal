import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { getTradingAccountById } from "@/lib/trading/account/service";
import { processScreenshot } from "@/lib/trading/smart-import/service";
import { buildImportPreview } from "@/lib/trading/import/service";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 });
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Unsupported image format. Use PNG, JPEG, or WebP." }, { status: 400 });
    }

    // Verify account ownership
    const account = await getTradingAccountById(accountId);
    if (!account || account.userId !== userId) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Account not found or access denied" }, { status: 404 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process screenshot via Smart Import pipeline
    const result = await processScreenshot(buffer, file.type, account.id);

    // If we extracted no candidates, return early
    if (result.candidates.length === 0) {
      return NextResponse.json({
        success: true,
        sourceDetection: result.sourceDetection,
        preview: {
          candidates: [],
          duplicateCount: 0,
          errorCount: 0,
          readyCount: 0,
        },
      });
    }

    // Manually run duplicate detection for Smart Import since candidates are already normalized
    const { listTrades } = await import("@/lib/trading/trade/service");
    const { detectDuplicate } = await import("@/lib/trading/import/duplicate");

    const recentTradesResult = await listTrades({
      filters: { tradingAccountId: account.id },
      pagination: { page: 1, pageSize: 5000 },
      sort: { field: "entryDate", direction: "desc" }
    });
    const existingTrades = recentTradesResult.items as any[];

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

    return NextResponse.json({
      success: true,
      sourceDetection: result.sourceDetection,
      preview,
    });
  } catch (error: any) {
    console.error("Smart Import Error:", error);
    if (error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to process screenshot" }, { status: 500 });
  }
}
