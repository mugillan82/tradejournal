import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "./route";
import { getDataManagementOverview } from "@/lib/trading/data-management/service";
import { ExportUnauthorizedError } from "@/lib/trading/data-management/errors";

vi.mock("@/lib/trading/data-management/service", () => ({
  getDataManagementOverview: vi.fn(),
}));

describe("GET /api/data-management/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with overview counts for authenticated user", async () => {
    const mockOverview = {
      accounts: 3,
      trades: 42,
      executions: 84,
      journalEntries: 10,
      tradeNotes: 15,
      reviews: 4,
      tags: 12,
      strategies: 5,
      setups: 8,
      mistakes: 3,
      attachments: 6,
    };

    vi.mocked(getDataManagementOverview).mockResolvedValue(mockOverview);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");

    const json = await response.json();
    expect(json).toEqual({ data: mockOverview });
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(getDataManagementOverview).mockRejectedValue(
      new ExportUnauthorizedError("Authentication required to view data overview")
    );

    const response = await GET();

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });
});
