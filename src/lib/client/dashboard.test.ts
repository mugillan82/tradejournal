import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildDashboardQueryString,
  fetchDashboardOverview,
  DashboardClientApiError,
} from "./dashboard";

describe("Dashboard Client API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("buildDashboardQueryString", () => {
    it("returns empty string when filters are undefined or empty", () => {
      expect(buildDashboardQueryString()).toBe("");
      expect(buildDashboardQueryString({})).toBe("");
    });

    it("serializes account and date range parameters", () => {
      const d1 = new Date("2026-01-01T00:00:00.000Z");
      const d2 = new Date("2026-01-31T23:59:59.999Z");
      const qs = buildDashboardQueryString({
        tradingAccountId: "acc-123",
        dateFrom: d1,
        dateTo: d2,
      });

      expect(qs).toContain("tradingAccountId=acc-123");
      expect(qs).toContain("dateFrom=2026-01-01T00%3A00%3A00.000Z");
      expect(qs).toContain("dateTo=2026-01-31T23%3A59%3A59.999Z");
    });
  });

  describe("fetchDashboardOverview", () => {
    it("fetches dashboard data successfully", async () => {
      const mockDto = {
        performance: { totalTrades: 10, netPnl: "1000.00" },
        equityCurve: [],
        today: { netPnl: "0.00", tradeCount: 0, winCount: 0, lossCount: 0, winRate: 0 },
        currentMonth: { monthStr: "2026-09", netPnl: "1000.00", tradeCount: 10, winCount: 6, lossCount: 4, winRate: 60 },
        recentTrades: [],
        topSymbols: [],
        topStrategies: [],
        direction: { long: {}, short: {} },
        accounts: [],
        recentJournalEntries: [],
        calendar: { month: "2026-09", summary: {}, days: [] },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDto,
      } as Response);

      const res = await fetchDashboardOverview({ tradingAccountId: "acc-1" });
      expect(res).toEqual(mockDto);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/dashboard/overview?tradingAccountId=acc-1",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("throws DashboardClientApiError on server failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid parameters", type: "VALIDATION" }),
      } as Response);

      await expect(fetchDashboardOverview()).rejects.toThrow(DashboardClientApiError);
    });
  });
});
