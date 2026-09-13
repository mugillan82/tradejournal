import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { CsvParser } from "@/lib/trading/import/csv";
import { buildImportPreview } from "@/lib/trading/import/service";
import { ColumnMapping } from "@/lib/trading/import/mapping";
import { createInvalidFileTypeError, createFileTooLargeError } from "@/lib/trading/import/errors";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    await requireServerUserId();
  } catch {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const tradingAccountId = formData.get("tradingAccountId") as string | null;
    const mappingRaw = formData.get("mapping") as string | null;

    if (!file) {
      return NextResponse.json({ error: { message: "File is required" } }, { status: 400 });
    }
    if (!tradingAccountId) {
      return NextResponse.json({ error: { message: "Trading account ID is required" } }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      throw createFileTooLargeError(10);
    }

    let mapping: ColumnMapping = {};
    if (mappingRaw) {
      try {
        mapping = JSON.parse(mappingRaw);
      } catch {
        return NextResponse.json({ error: { message: "Invalid mapping JSON" } }, { status: 400 });
      }
    }

    // Determine parser (Only CSV for now)
    const parser = new CsvParser();
    if (!parser.canHandle(file)) {
      throw createInvalidFileTypeError(["CSV"]);
    }

    const { records, errors } = await parser.parse(file);

    if (records.length === 0) {
      return NextResponse.json(
        { error: { message: "File contains no valid records.", details: errors } }, 
        { status: 400 }
      );
    }

    const preview = await buildImportPreview(records, mapping, tradingAccountId);

    return NextResponse.json(preview, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof Error && err.name === "ImportError") {
      const importErr = err as Error & { code?: string };
      return NextResponse.json({ error: { code: importErr.code, message: importErr.message } }, { status: 400 });
    }
    console.error("Preview error:", err);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
