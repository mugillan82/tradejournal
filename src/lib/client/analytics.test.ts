/**
 * Client Data Layer — Analytics Tests
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildAnalyticsQueryString,
  fetchAnalyticsOverview,
  fetchFilterOptions,
  AnalyticsClientApiError,
} from "./analytics";

describe("Client Analytics — buildAnalyticsQueryString", () => {
  it("builds empty query string for empty filter", () => {
    expect(buildAnalyticsQueryString({})).toBe("");
    expect(buildAnalyticsQueryString(undefined)).toBe("");
  });

  it("serializes all filter properties properly", () => {
    const from = new Date("2025-01-01T00:00:00.000Z");
    const to = new Date("2025-01-31T23:59:59.999Z");

    const qs = buildAnalyticsQueryString({
      dateFrom: from,
      dateTo: to,
      tradingAccountId: "acc-1",
      symbol: "AAPL",
      side: "LONG",
      status: "CLOSED",
      strategyId: "strat-1",
      setupId: "setup-1",
      tagId: "tag-1",
      mistakeId: "mistake-1",
    });

    const params = new URLSearchParams(qs);
    expect(params.get("dateFrom")).toBe(from.toISOString());
    expect(params.get("dateTo")).toBe(to.toISOString());
    expect(params.get("tradingAccountId")).toBe("acc-1");
    expect(params.get("symbol")).toBe("AAPL");
    expect(params.get("side")).toBe("LONG");
    expect(params.get("status")).toBe("CLOSED");
    expect(params.get("strategyId")).toBe("strat-1");
    expect(params.get("setupId")).toBe("setup-1");
    expect(params.get("tagId")).toBe("tag-1");
    expect(params.get("mistakeId")).toBe("mistake-1");
  });
});

describe("Client Analytics — fetchAnalyticsOverview", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetches and parses analytics overview successfully", async () => {
    const mockOverview = {
      metrics: {
        totalTrades: 10,
        winRate: 70,
        netPnl: "1200.00",
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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockOverview,
    });

    const result = await fetchAnalyticsOverview({ symbol: "TSLA" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/analytics/overview?symbol=TSLA",
      expect.objectContaining({
        method: "GET",
        headers: { Accept: "application/json" },
      }),
    );
    expect(result).toEqual(mockOverview);
  });

  it("throws AnalyticsClientApiError on non-200 API response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: "VALIDATION",
          message: "Invalid date range",
          fieldErrors: [{ path: "dateTo", message: "dateTo cannot be earlier than dateFrom" }],
        },
      }),
    });

    await expect(fetchAnalyticsOverview({})).rejects.toThrow(AnalyticsClientApiError);
  });
});

describe("Client Analytics — fetchFilterOptions", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetches dropdown classification and account options", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/trading-accounts")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: [{ id: "acc-1", name: "Main", currency: "USD" }] }),
        });
      }
      if (url.includes("/api/strategies")) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: "strat-1", name: "Breakout" }],
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    const options = await fetchFilterOptions();
    expect(options.accounts).toHaveLength(1);
    expect(options.accounts[0].name).toBe("Main");
    expect(options.strategies).toHaveLength(1);
    expect(options.strategies[0].name).toBe("Breakout");
  });
});
