import "server-only";

import { NextResponse } from "next/server";
import { getDataManagementOverview } from "@/lib/trading/data-management/service";
import { handleDataManagementApiError } from "../handler";

export async function GET(): Promise<NextResponse> {
  try {
    const overview = await getDataManagementOverview();
    return NextResponse.json(
      { data: overview },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    return handleDataManagementApiError(error);
  }
}
