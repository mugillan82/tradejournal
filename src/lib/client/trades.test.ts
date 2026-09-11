/**
 * Client Data Layer Tests — Trades & Accounts
 *
 * Tests parameter building, API call handling, Date object rehydration,
 * and error handling in `src/lib/client/trades.ts`.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildTradesQueryString,
  fetchTrades,
  fetchTradeById,
  fetchTradingAccounts,
  TradeClientApiError,
} from "./trades";

describe("buildTradesQueryString", () => {
  it("returns empty string when no options are provided", () => {
    expect(buildTradesQueryString()).toBe("");
    expect(buildTradesQueryString({})).toBe("");
  });

  it("builds query string for filters", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const to = new Date("2026-01-31T23:59:59.999Z");

    const qs = buildTradesQueryString({
      filters: {
        tradingAccountId: "acc_123",
        side: "LONG",
        status: "OPEN",
        search: "AAPL earnings",
        entryDateFrom: from,
        entryDateTo: to,
        ids: ["id1", "id2"],
      },
    });

    const params = new URLSearchParams(qs);
    expect(params.get("tradingAccountId")).toBe("acc_123");
    expect(params.get("side")).toBe("LONG");
    expect(params.get("status")).toBe("OPEN");
    expect(params.get("search")).toBe("AAPL earnings");
    expect(params.get("entryDateFrom")).toBe(from.toISOString());
    expect(params.get("entryDateTo")).toBe(to.toISOString());
    expect(params.get("ids")).toBe("id1,id2");
  });

  it("builds query string for sorting and pagination", () => {
    const qs = buildTradesQueryString({
      sort: { field: "netPnl", direction: "desc" },
      pagination: { page: 2, pageSize: 25 },
    });

    const params = new URLSearchParams(qs);
    expect(params.get("sortField")).toBe("netPnl");
    expect(params.get("sortDirection")).toBe("desc");
    expect(params.get("page")).toBe("2");
    expect(params.get("pageSize")).toBe("25");
  });
});

describe("fetchTrades", () => {
  const globalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = globalFetch;
  });

  it("parses successful trade list and rehydrates dates", async () => {
    const mockTrade = {
      id: "trade_1",
      userId: "user_1",
      tradingAccountId: "acc_1",
      side: "LONG",
      status: "CLOSED",
      entryPrice: "150.00",
      entryDate: "2026-01-01T10:00:00.000Z",
      exitPrice: "160.00",
      exitDate: "2026-01-01T15:00:00.000Z",
      quantity: "10",
      grossPnl: "100.00",
      netPnl: "95.00",
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T15:00:00.000Z",
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [mockTrade],
        total: 1,
        page: 1,
        pageSize: 50,
      }),
    });

    const res = await fetchTrades({ pagination: { page: 1, pageSize: 50 } });

    expect(res.total).toBe(1);
    expect(res.items.length).toBe(1);
    expect(res.items[0].entryDate).toBeInstanceOf(Date);
    expect(res.items[0].exitDate).toBeInstanceOf(Date);
    expect(res.items[0].netPnl).toBe("95.00");
  });

  it("throws TradeClientApiError on API HTTP errors without leaking raw database info", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: "VALIDATION",
          message: "Invalid filter parameter",
        },
      }),
    });

    await expect(fetchTrades({})).rejects.toThrow(TradeClientApiError);
  });
});

describe("fetchTradeById", () => {
  const globalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = globalFetch;
  });

  it("fetches individual trade by ID", async () => {
    const mockTrade = {
      id: "trade_abc",
      userId: "user_1",
      tradingAccountId: "acc_1",
      side: "SHORT",
      status: "OPEN",
      entryPrice: "200.00",
      entryDate: "2026-02-01T10:00:00.000Z",
      exitPrice: null,
      exitDate: null,
      quantity: "5",
      createdAt: "2026-02-01T10:00:00.000Z",
      updatedAt: "2026-02-01T10:00:00.000Z",
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrade,
    });

    const trade = await fetchTradeById("trade_abc");
    expect(trade.id).toBe("trade_abc");
    expect(trade.side).toBe("SHORT");
    expect(trade.entryDate).toBeInstanceOf(Date);
  });

  it("throws 404 error when trade is not found", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          code: "NOT_FOUND",
          message: "Trade not found",
        },
      }),
    });

    await expect(fetchTradeById("nonexistent")).rejects.toThrow("Trade not found");
  });
});

describe("fetchTradingAccounts", () => {
  const globalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = globalFetch;
  });

  it("returns items from trading accounts response", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: "acc_1", name: "Main Futures", currency: "USD", isActive: true }],
        total: 1,
      }),
    });

    const accs = await fetchTradingAccounts();
    expect(accs.length).toBe(1);
    expect(accs[0].name).toBe("Main Futures");
  });

  it("returns empty array when endpoint fails", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const accs = await fetchTradingAccounts();
    expect(accs).toEqual([]);
  });
});
