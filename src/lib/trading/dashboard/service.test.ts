import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { getDashboardOverview } from "./service";
import * as authSession from "@/lib/auth/session";
import * as analyticsService from "../analytics/service";
import * as calendarService from "../calendar/service";
import * as tradeService from "../trade/service";
import * as accountService from "../account/service";
import * as journalService from "../journal/service";
import type { AnalyticsOverviewDto } from "../analytics/types";
import type { MonthCalendarDto } from "../calendar/types";
import type { TradeListResult } from "../trade/types";
import type { TradingAccountListResult } from "../account/types";
import type { JournalEntryListResult } from "../journal/types";

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("../analytics/service", () => ({
  getAnalyticsOverview: vi.fn(),
}));

vi.mock("../calendar/service", () => ({
  getMonthCalendar: vi.fn(),
  normalizeMonthParam: vi.fn(() => "2026-09"),
}));

vi.mock("../trade/service", () => ({
  listTrades: vi.fn(),
}));

vi.mock("../account/service", () => ({
  listTradingAccounts: vi.fn(),
}));

vi.mock("../journal/service", () => ({
  listJournalEntries: vi.fn(),
}));

describe("Dashboard Service — Composition & Resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws AUTH_REQUIRED when user is not authenticated", async () => {
    vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("Unauthorized"));

    await expect(getDashboardOverview()).rejects.toThrow("Authentication is required");
  });

  it("composes sub-domains and returns DashboardOverviewDto", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");

    vi.mocked(analyticsService.getAnalyticsOverview).mockResolvedValue({
      metrics: {
        totalTrades: 10,
        closedTrades: 10,
        openTrades: 0,
        winningTrades: 6,
        losingTrades: 4,
        breakevenTrades: 0,
        winRate: 60,
        lossRate: 40,
        grossProfit: "1500.00",
        grossLoss: "500.00",
        netPnl: "1000.00",
        totalCommission: "10.00",
        totalFees: "5.00",
        totalSwap: "0.00",
        totalCosts: "15.00",
        averageTradePnl: "100.00",
        averageWinner: "250.00",
        averageLoser: "-125.00",
        largestWinner: "500.00",
        largestLoser: "-200.00",
        profitFactor: "3.00",
        expectancy: "100.00",
        totalRisk: "500.00",
        averageR: "1.50",
        averageWinningR: "2.00",
        averageLosingR: "-1.00",
        maxDrawdown: "250.00",
        maxDrawdownPercentage: 5,
        peakEquity: "1250.00",
        endingEquity: "1000.00",
        winningStreak: 4,
        losingStreak: 2,
        currentStreak: { count: 2, type: "WIN" },
        averageHoldingDurationSeconds: 7200,
        totalHoldingDurationSeconds: 72000,
        longTradeCount: 6,
        shortTradeCount: 4,
        longWinRate: 66.67,
        shortWinRate: 50,
        longNetPnl: "700.00",
        shortNetPnl: "300.00",
      },
      equityCurve: [],
      byDate: [],
      bySymbol: [
        {
          symbol: "AAPL",
          tradeCount: 6,
          winCount: 4,
          lossCount: 2,
          netPnl: "700.00",
          winRate: 66.67,
          profitFactor: "3.33",
        },
      ],
      byStrategy: [
        {
          strategyId: "s1",
          strategyName: "Breakout",
          tradeCount: 8,
          winCount: 5,
          lossCount: 3,
          netPnl: "800.00",
          winRate: 62.5,
        },
      ],
      bySetup: [],
      byTag: [],
      byMistake: [],
      byAccount: [],
    } as unknown as AnalyticsOverviewDto);

    vi.mocked(calendarService.getMonthCalendar).mockResolvedValue({
      month: "2026-09",
      summary: {
        month: "2026-09",
        totalTrades: 10,
        closedTrades: 10,
        openTrades: 0,
        winningTrades: 6,
        losingTrades: 4,
        breakevenTrades: 0,
        netPnl: "1000.00",
        grossProfit: "1500.00",
        grossLoss: "500.00",
        winRate: 60,
        profitFactor: "3.00",
        winningDays: 4,
        losingDays: 1,
        breakevenDays: 0,
        bestDay: { date: "2026-09-01", netPnl: "500.00" },
        worstDay: { date: "2026-09-05", netPnl: "-200.00" },
        averageDailyPnl: "200.00",
        totalRisk: "500.00",
        averageR: "1.50",
      },
      days: {},
    } as unknown as MonthCalendarDto);

    vi.mocked(tradeService.listTrades).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 6,
    } as unknown as TradeListResult);

    vi.mocked(accountService.listTradingAccounts).mockResolvedValue({
      items: [
        {
          id: "acc-1",
          userId: "user-1",
          name: "Main Broker",
          type: "LIVE",
          currency: "USD",
          initialBalance: "10000.00",
          currentBalance: "11000.00",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    } as unknown as TradingAccountListResult);

    vi.mocked(journalService.listJournalEntries).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 4,
    } as unknown as JournalEntryListResult);

    const result = await getDashboardOverview();

    expect(result).toBeDefined();
    expect(result.performance.netPnl).toBe("1000.00");
    expect(result.currentMonth.monthStr).toBe("2026-09");
    expect(result.accounts.length).toBe(1);
    expect(result.topSymbols.length).toBe(1);
    expect(result.topStrategies.length).toBe(1);
  });
});
