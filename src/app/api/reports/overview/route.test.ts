import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
import { GET } from "./route";
import * as authSession from "@/lib/auth/session";
import * as reportsService from "@/lib/trading/reports/service";
import type { ReportOverviewDto } from "@/lib/trading/reports/types";

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("@/lib/trading/reports/service", () => ({
  getReportOverview: vi.fn(),
}));

describe("GET /api/reports/overview", () => {
  const mockUserId = "usr-report-api-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 AUTH_REQUIRED when user is not authenticated", async () => {
    vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("Unauthorized"));

    const req = new NextRequest("http://localhost:3000/api/reports/overview");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 200 with report DTO when user is authenticated", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);

    const mockReport = {
      performance: {
        totalTrades: 10,
        closedTrades: 8,
        openTrades: 2,
        winningTrades: 5,
        losingTrades: 3,
        breakevenTrades: 0,
        winRate: 62.5,
        lossRate: 37.5,
        grossProfit: "2000.00",
        grossLoss: "600.00",
        netPnl: "1350.00",
        totalCommission: "30.00",
        totalFees: "20.00",
        totalSwap: "0.00",
        totalCosts: "50.00",
        averageTradePnl: "168.75",
        averageWinner: "400.00",
        averageLoser: "-200.00",
        largestWinner: "750.00",
        largestLoser: "-400.00",
        profitFactor: "3.33",
        expectancy: "168.75",
        totalRisk: "800.00",
        averageR: "1.50",
        averageWinningR: "2.20",
        averageLosingR: "-0.90",
        maxDrawdown: "400.00",
        maxDrawdownPercentage: 4.0,
        peakEquity: "11350.00",
        endingEquity: "11350.00",
        winningStreak: 3,
        losingStreak: 2,
        currentStreak: { count: 2, type: "WIN" },
        averageHoldingDurationSeconds: 5400,
        totalHoldingDurationSeconds: 43200,
        longTradeCount: 5,
        shortTradeCount: 3,
        longNetPnl: "900.00",
        shortNetPnl: "450.00",
        longWinRate: 60.0,
        shortWinRate: 66.67,
      },
      equityCurve: [],
      symbols: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
      accounts: [],
      direction: {
        long: {
          tradeCount: 5,
          winCount: 3,
          lossCount: 2,
          netPnl: "900.00",
          winRate: 60,
          averageTradePnl: "180.00",
          grossProfit: "1200.00",
          grossLoss: "300.00",
          averageR: "1.80",
        },
        short: {
          tradeCount: 3,
          winCount: 2,
          lossCount: 1,
          netPnl: "450.00",
          winRate: 66.67,
          averageTradePnl: "150.00",
          grossProfit: "800.00",
          grossLoss: "350.00",
          averageR: "1.20",
        },
      },
      time: {
        daily: [],
        monthly: [],
      },
    };

    vi.mocked(reportsService.getReportOverview).mockResolvedValue(mockReport as unknown as ReportOverviewDto);

    const req = new NextRequest("http://localhost:3000/api/reports/overview?symbol=AAPL&side=LONG");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(body.performance.netPnl).toBe("1350.00");
    expect(reportsService.getReportOverview).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "AAPL",
        side: "LONG",
      }),
      mockUserId,
    );
  });
});
