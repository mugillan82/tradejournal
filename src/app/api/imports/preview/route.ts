import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { CsvParser } from "@/lib/trading/import/csv";
import { XlsxParser } from "@/lib/trading/import/xlsx";
import { buildImportPreview } from "@/lib/trading/import/service";
import { ColumnMapping, CanonicalField, detectColumnMappings } from "@/lib/trading/import/mapping";
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
    const sheetName = formData.get("sheetName") as string | null;
    const delimiter = formData.get("delimiter") as string | null;
    const timezone = formData.get("timezone") as string | null;

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
    let hasExplicitMapping = false;
    if (mappingRaw) {
      try {
        mapping = JSON.parse(mappingRaw);
        hasExplicitMapping = Object.keys(mapping).length > 0;
      } catch {
        return NextResponse.json({ error: { message: "Invalid mapping JSON" } }, { status: 400 });
      }
    }

    const fileName = file.name.toLowerCase();
    const isXlsx = fileName.endsWith(".xlsx") || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const isCsv = fileName.endsWith(".csv") || file.type === "text/csv" || file.type === "application/csv";

    if (!isXlsx && !isCsv) {
      throw createInvalidFileTypeError(["CSV", "XLSX"]);
    }

    let records;
    let errors: string[] = [];
    let detectedHeaders: string[] = [];
    let availableSheets: string[] | undefined = undefined;
    let selectedSheet: string | undefined = undefined;
    let detectedDelimiter: string | undefined = undefined;

    if (isXlsx) {
      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      if (!XlsxParser.verifyZipMagicBytes(buffer)) {
        throw createInvalidFileTypeError(["XLSX"]);
      }

      const xlsxParser = new XlsxParser();
      const xlsxResult = await xlsxParser.parseBuffer(buffer, {
        sheetName: sheetName || undefined,
      });

      records = xlsxResult.records;
      errors = xlsxResult.errors;
      availableSheets = xlsxResult.availableSheets;
      selectedSheet = xlsxResult.selectedSheet;
    } else {
      const csvParser = new CsvParser();
      const text = await file.text();
      detectedDelimiter = delimiter || csvParser.detectDelimiter(text);
      const csvResult = csvParser.parseCsvString(text, {
        delimiter: detectedDelimiter,
      });

      records = csvResult.records;
      errors = csvResult.errors;
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: { message: "File contains no valid records.", details: errors } },
        { status: 400 }
      );
    }

    detectedHeaders = Object.keys(records[0].data);

    // If no explicit mapping was provided by user, auto-detect
    let unmappedColumns: string[] = [];
    let missingRequiredFields: string[] = [];

    if (!hasExplicitMapping) {
      const detection = detectColumnMappings(detectedHeaders);
      mapping = detection.mapping;
      unmappedColumns = detection.unmappedColumns;
      missingRequiredFields = detection.missingRequiredFields;
    } else {
      const mappedCanonical = new Set(Object.values(mapping).filter(Boolean));
      unmappedColumns = detectedHeaders.filter((h) => !mapping[h]);
      const requiredFields: CanonicalField[] = ["symbol", "side", "quantity", "entryPrice", "entryDate"];
      missingRequiredFields = requiredFields.filter((f) => !mappedCanonical.has(f));
    }

    const preview = await buildImportPreview(records, mapping, tradingAccountId, {
      headers: detectedHeaders,
      unmappedColumns,
      missingRequiredFields,
      availableSheets,
      selectedSheet,
      detectedDelimiter,
      parseErrors: errors,
      timezone: timezone || undefined,
    });

    return NextResponse.json(preview, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof Error && (err.name === "ImportError" || "code" in err)) {
      const importErr = err as Error & { code?: string };
      return NextResponse.json(
        { error: { code: importErr.code, message: importErr.message } },
        { status: 400 }
      );
    }
    console.error("Preview error:", err);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: { message: "Method not allowed" } }, { status: 405, headers: { Allow: "POST" } });
}

export async function PUT() {
  return NextResponse.json({ error: { message: "Method not allowed" } }, { status: 405, headers: { Allow: "POST" } });
}

export async function DELETE() {
  return NextResponse.json({ error: { message: "Method not allowed" } }, { status: 405, headers: { Allow: "POST" } });
}
