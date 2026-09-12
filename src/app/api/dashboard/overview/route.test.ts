import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import * as authSession from "@/lib/auth/session";
import * as dashboardService from "@/lib/trading/dashboard/service";
import type { DashboardOverviewDto } from "@/lib/trading/dashboard/types";
import { DashboardServiceError } from "@/lib/trading/dashboard/errors";

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("@/lib/trading/dashboard/service", () => ({
  getDashboardOverview: vi.fn(),
}));

describe("GET /api/dashboard/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session userId is missing", async () => {
    vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("Unauthorized"));

    const req = new NextRequest("http://localhost/api/dashboard/overview");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.type).toBe("AUTH_REQUIRED");
  });

  it("returns 200 with dashboard overview data on valid request", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");

    const mockData = {
      performance: {
        totalTrades: 10,
        netPnl: "1000.00",
      },
      equityCurve: [],
      today: { netPnl: "0.00", tradeCount: 0, winCount: 0, lossCount: 0, winRate: 0 },
      currentMonth: { monthStr: "2026-09", netPnl: "1000.00", tradeCount: 10, winCount: 6, lossCount: 4, winRate: 60 },
      recentTrades: [],
      topSymbols: [],
      topStrategies: [],
      direction: {
        long: { tradeCount: 6, netPnl: "700.00" },
        short: { tradeCount: 4, netPnl: "300.00" },
      },
      accounts: [],
      recentJournalEntries: [],
      calendar: { month: "2026-09", summary: {}, days: [] },
    };

    vi.mocked(dashboardService.getDashboardOverview).mockResolvedValue(
      mockData as unknown as DashboardOverviewDto,
    );

    const req = new NextRequest("http://localhost/api/dashboard/overview?tradingAccountId=acc-1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = await res.json();
    expect(json.performance.netPnl).toBe("1000.00");
  });

  it("returns 400 on validation error from service", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    vi.mocked(dashboardService.getDashboardOverview).mockRejectedValue(
      new DashboardServiceError("VALIDATION", "Invalid filters", [{ field: "dateRange", message: "Invalid range" }]),
    );

    const req = new NextRequest("http://localhost/api/dashboard/overview");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.type).toBe("VALIDATION");
  });
});
