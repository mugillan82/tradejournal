/**
 * Analytics API — Overview Route Integration Tests
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockGetAnalyticsOverview = vi.fn();
const mockRequireServerUserId = vi.fn();

vi.mock("@/lib/trading/analytics/service", () => ({
  getAnalyticsOverview: (...args: unknown[]) => mockGetAnalyticsOverview(...args),
}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: () => mockRequireServerUserId(),
}));

vi.mock("server-only", () => ({}));

describe("GET /api/analytics/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireServerUserId.mockRejectedValue(new Error("Unauthorized"));

    const request = new NextRequest("http://localhost:3000/api/analytics/overview");
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const json = await response.json();
    expect(json.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 200 with analytics overview payload and Cache-Control: no-store", async () => {
    mockRequireServerUserId.mockResolvedValue("user-123");
    const mockOverview = {
      metrics: {
        totalTrades: 5,
        winRate: 60,
        netPnl: "500.00",
      },
      byDate: [],
      bySymbol: [],
      byStrategy: [],
      bySetup: [],
      byTag: [],
      byMistake: [],
      byAccount: [],
      equityCurve: [],
    };
    mockGetAnalyticsOverview.mockResolvedValue(mockOverview);

    const request = new NextRequest(
      "http://localhost:3000/api/analytics/overview?symbol=AAPL&side=LONG&tradingAccountId=acc-1",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const json = await response.json();
    expect(json).toEqual(mockOverview);

    expect(mockGetAnalyticsOverview).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "AAPL",
        side: "LONG",
        tradingAccountId: "acc-1",
      }),
      "user-123",
    );
  });

  it("returns 400 when validation fails on invalid query filter", async () => {
    mockRequireServerUserId.mockResolvedValue("user-123");

    const { createValidationError } = await import(
      "@/lib/trading/analytics/errors"
    );
    mockGetAnalyticsOverview.mockRejectedValue(
      createValidationError([
        { path: "side", message: "side must be one of: LONG, SHORT" },
      ]),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/analytics/overview?side=INVALID",
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION");
    expect(json.error.fieldErrors[0].path).toBe("side");
  });
});
