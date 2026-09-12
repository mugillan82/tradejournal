import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildCalendarQueryString,
  fetchMonthCalendar,
  CalendarClientApiError,
} from "./calendar";

describe("Calendar Client Data Layer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildCalendarQueryString", () => {
    it("builds query with month parameter", () => {
      const qs = buildCalendarQueryString("2026-09");
      expect(qs).toBe("month=2026-09");
    });

    it("serializes all dimensional filters into query string", () => {
      const qs = buildCalendarQueryString("2026-09", {
        tradingAccountId: "acc-1",
        symbol: "AAPL",
        side: "LONG",
        status: "CLOSED",
        strategyId: "s-1",
        setupId: "set-1",
        tagId: "t-1",
        mistakeId: "m-1",
      });

      expect(qs).toContain("month=2026-09");
      expect(qs).toContain("tradingAccountId=acc-1");
      expect(qs).toContain("symbol=AAPL");
      expect(qs).toContain("side=LONG");
      expect(qs).toContain("status=CLOSED");
      expect(qs).toContain("strategyId=s-1");
      expect(qs).toContain("setupId=set-1");
      expect(qs).toContain("tagId=t-1");
      expect(qs).toContain("mistakeId=m-1");
    });
  });

  describe("fetchMonthCalendar", () => {
    it("fetches and parses calendar data on successful 200 response", async () => {
      const mockResult = {
        month: "2026-09",
        summary: {
          month: "2026-09",
          totalTrades: 3,
          closedTrades: 3,
          openTrades: 0,
          winningTrades: 2,
          losingTrades: 1,
          breakevenTrades: 0,
          netPnl: "450.00",
          grossProfit: "600.00",
          grossLoss: "150.00",
          winRate: 66.67,
          profitFactor: "4.00",
          winningDays: 1,
          losingDays: 1,
          breakevenDays: 0,
          bestDay: { date: "2026-09-02", netPnl: "600.00" },
          worstDay: { date: "2026-09-05", netPnl: "-150.00" },
          averageDailyPnl: "225.00",
          totalRisk: "300.00",
          averageR: "1.50",
        },
        days: {},
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResult,
      });

      const data = await fetchMonthCalendar("2026-09", { symbol: "TSLA" });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/calendar/month?month=2026-09&symbol=TSLA",
        expect.objectContaining({
          method: "GET",
          cache: "no-store",
        }),
      );
      expect(data).toEqual(mockResult);
    });

    it("throws CalendarClientApiError with server message on error response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: "AUTH_REQUIRED",
            message: "Authentication required",
          },
        }),
      });

      await expect(fetchMonthCalendar("2026-09")).rejects.toThrowError(CalendarClientApiError);
    });
  });
});
