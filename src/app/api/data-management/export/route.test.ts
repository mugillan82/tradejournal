import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "./route";
import { exportData } from "@/lib/trading/data-management/service";
import { ExportUnauthorizedError } from "@/lib/trading/data-management/errors";
import { NextRequest } from "next/server";

vi.mock("@/lib/trading/data-management/service", () => ({
  exportData: vi.fn(),
}));

describe("GET /api/data-management/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with CSV payload and attachment headers for valid trades request", async () => {
    vi.mocked(exportData).mockResolvedValue({
      data: "Trade ID,Account ID\r\ntrade-1,acc-1",
      filename: "tradejournal-trades-2026-02-01.csv",
      mimeType: "text/csv; charset=utf-8",
      dataset: "trades",
      format: "csv",
      recordCount: 1,
    });

    const req = new NextRequest("http://localhost:3000/api/data-management/export?dataset=trades&format=csv");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="tradejournal-trades-2026-02-01.csv"');
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("X-Export-Records")).toBe("1");

    const text = await res.text();
    expect(text).toBe("Trade ID,Account ID\r\ntrade-1,acc-1");
  });

  it("returns 400 for invalid dataset", async () => {
    const req = new NextRequest("http://localhost:3000/api/data-management/export?dataset=invalid_dataset");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_EXPORT_PARAMETERS");
  });

  it("returns 400 for unsupported format", async () => {
    const req = new NextRequest("http://localhost:3000/api/data-management/export?dataset=full&format=csv");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("UNSUPPORTED_EXPORT_FORMAT");
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(exportData).mockRejectedValue(
      new ExportUnauthorizedError("Authentication required for trade export")
    );

    const req = new NextRequest("http://localhost:3000/api/data-management/export?dataset=trades");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });
});
