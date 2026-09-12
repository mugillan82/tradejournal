import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildReportQueryString,
  fetchReportOverview,
  ReportClientApiError,
} from "./reports";

describe("Reports Client Data Layer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildReportQueryString", () => {
    it("serializes report filters accurately", () => {
      const qs = buildReportQueryString({
        symbol: "MSFT",
        side: "LONG",
        status: "CLOSED",
      });

      expect(qs).toContain("symbol=MSFT");
      expect(qs).toContain("side=LONG");
      expect(qs).toContain("status=CLOSED");
    });
  });

  describe("fetchReportOverview", () => {
    it("fetches and parses report overview on successful 200 response", async () => {
      const mockResult = {
        performance: {
          totalTrades: 5,
          closedTrades: 5,
          openTrades: 0,
          winningTrades: 3,
          losingTrades: 2,
          breakevenTrades: 0,
          winRate: 60,
          lossRate: 40,
          grossProfit: "1000.00",
          grossLoss: "400.00",
          netPnl: "550.00",
          totalCommission: "30.00",
          totalFees: "20.00",
          totalSwap: "0.00",
          totalCosts: "50.00",
          averageTradePnl: "110.00",
          averageWinner: "333.33",
          averageLoser: "-200.00",
          largestWinner: "500.00",
          largestLoser: "-250.00",
          profitFactor: "2.50",
          expectancy: "110.00",
          totalRisk: "500.00",
          averageR: "1.20",
          averageWinningR: "1.80",
          averageLosingR: "-0.90",
          maxDrawdown: "250.00",
          maxDrawdownPercentage: null,
          peakEquity: null,
          endingEquity: null,
          winningStreak: 2,
          losingStreak: 1,
          currentStreak: { count: 1, type: "WIN" },
          averageHoldingDurationSeconds: 3600,
          totalHoldingDurationSeconds: 18000,
          longTradeCount: 3,
          shortTradeCount: 2,
          longNetPnl: "350.00",
          shortNetPnl: "200.00",
          longWinRate: 66.67,
          shortWinRate: 50,
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
            tradeCount: 3,
            winCount: 2,
            lossCount: 1,
            netPnl: "350.00",
            winRate: 66.67,
            averageTradePnl: "116.67",
            grossProfit: "500.00",
            grossLoss: "150.00",
            averageR: "1.30",
          },
          short: {
            tradeCount: 2,
            winCount: 1,
            lossCount: 1,
            netPnl: "200.00",
            winRate: 50,
            averageTradePnl: "100.00",
            grossProfit: "500.00",
            grossLoss: "250.00",
            averageR: "1.00",
          },
        },
        time: {
          daily: [],
          monthly: [],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResult,
      });

      const data = await fetchReportOverview({ symbol: "MSFT" });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/reports/overview?symbol=MSFT",
        expect.objectContaining({
          method: "GET",
          cache: "no-store",
        }),
      );
      expect(data).toEqual(mockResult);
    });

    it("throws ReportClientApiError with server message on error response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "VALIDATION",
            message: "Invalid date range",
          },
        }),
      });

      await expect(fetchReportOverview({})).rejects.toThrowError(ReportClientApiError);
    });
  });
});
