import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { validateExportFilterInput } from "@/lib/trading/data-management/validation";
import { exportData } from "@/lib/trading/data-management/service";
import { handleDataManagementApiError } from "../handler";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const dataset = searchParams.get("dataset") ?? undefined;
    const format = searchParams.get("format") ?? undefined;
    const accountId = searchParams.get("accountId") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    // Validate parameters
    const validatedFilters = validateExportFilterInput({
      dataset,
      format,
      accountId,
      from,
      to,
    });

    const result = await exportData(validatedFilters);

    // Build response with download headers
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Export-Records": result.recordCount.toString(),
      },
    });
  } catch (error) {
    return handleDataManagementApiError(error);
  }
}
