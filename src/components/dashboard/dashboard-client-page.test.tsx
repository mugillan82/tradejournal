// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DashboardClientPage } from "./dashboard-client-page";
import * as dashboardClient from "@/lib/client/dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));

const mockDashboardData: dashboardClient.DashboardOverviewDto = {
  performance: {
    totalTrades: 12,
    closedTrades: 12,
    openTrades: 0,
    winningTrades: 8,
    losingTrades: 4,
    breakevenTrades: 0,
    winRate: 66.67,
    lossRate: 33.33,
    grossProfit: "2400.00",
    grossLoss: "800.00",
    netPnl: "1600.00",
    totalCommission: "20.00",
    totalFees: "10.00",
    totalSwap: "0.00",
    totalCosts: "30.00",
    averageTradePnl: "133.33",
    averageWinner: "300.00",
    averageLoser: "-200.00",
    largestWinner: "500.00",
    largestLoser: "-300.00",
    profitFactor: "3.00",
    expectancy: "133.33",
    totalRisk: "800.00",
    averageR: "1.75",
    averageWinningR: "2.25",
    averageLosingR: "-1.00",
    maxDrawdown: "400.00",
    maxDrawdownPercentage: 8,
    peakEquity: "2000.00",
    endingEquity: "1600.00",
    winningStreak: 5,
    losingStreak: 2,
    currentStreak: {
      count: 3,
      type: "WIN",
    },
    averageHoldingDurationSeconds: 5400,
    totalHoldingDurationSeconds: 64800,
    longTradeCount: 8,
    shortTradeCount: 4,
    longWinRate: 75,
    shortWinRate: 50,
    longNetPnl: "1200.00",
    shortNetPnl: "400.00",
  },
  equityCurve: [
    {
      tradeId: "t1",
      exitDate: "2026-09-01T10:00:00.000Z",
      netPnl: "500.00",
      cumulativePnl: "500.00",
      equity: "500.00",
      drawdown: "0.00",
    },
  ],
  today: {
    netPnl: "350.00",
    tradeCount: 2,
    winCount: 2,
    lossCount: 0,
    winRate: 100,
  },
  currentMonth: {
    monthStr: "2026-09",
    netPnl: "1600.00",
    tradeCount: 12,
    winCount: 8,
    lossCount: 4,
    winRate: 66.67,
  },
  recentTrades: [
    {
      id: "trade-1",
      userId: "user-1",
      tradingAccountId: "acc-1",
      title: "NVDA Long Breakout",
      side: "LONG",
      status: "CLOSED",
      entryDate: new Date("2026-09-12T10:00:00.000Z"),
      exitDate: new Date("2026-09-12T11:00:00.000Z"),
      entryPrice: "120.00",
      exitPrice: "125.00",
      stopLoss: "118.00",
      takeProfit: "126.00",
      riskAmount: "200.00",
      plannedRiskReward: "3.00",
      actualRMultiple: "2.50",
      quantity: "100",
      grossPnl: "500.00",
      commission: "0.00",
      fees: "0.00",
      swap: "0.00",
      netPnl: "500.00",
      notes: null,
      strategyId: null,
      setupId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  topSymbols: [
    {
      symbol: "NVDA",
      tradeCount: 6,
      winCount: 4,
      lossCount: 2,
      netPnl: "1000.00",
      winRate: 66.67,
      profitFactor: "3.50",
    },
  ],
  topStrategies: [
    {
      strategyId: "strat-1",
      strategyName: "Momentum Breakout",
      tradeCount: 8,
      winCount: 6,
      lossCount: 2,
      netPnl: "1200.00",
      winRate: 75,
    },
  ],
  direction: {
    long: {
      tradeCount: 8,
      winRate: 75,
      netPnl: "1200.00",
    },
    short: {
      tradeCount: 4,
      winRate: 50,
      netPnl: "400.00",
    },
  },
  accounts: [
    {
      id: "acc-1",
      userId: "user-1",
      name: "Main Futures",
      type: "LIVE",
      currency: "USD",
      initialBalance: "25000.00",
      currentBalance: "26600.00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  recentJournalEntries: [
    {
      id: "entry-1",
      userId: "user-1",
      entryDate: new Date("2026-09-12T00:00:00.000Z"),
      title: "Morning Review",
      mood: "GOOD",
      energy: 8,
      focus: 9,
      notes: "Solid execution during morning open. Followed trading plan.",
      tags: [],
      trades: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  calendar: {
    month: "2026-09",
    summary: {
      month: "2026-09",
      totalTrades: 12,
      closedTrades: 12,
      openTrades: 0,
      winningTrades: 8,
      losingTrades: 4,
      breakevenTrades: 0,
      netPnl: "1600.00",
      grossProfit: "2400.00",
      grossLoss: "800.00",
      winRate: 66.67,
      profitFactor: "3.00",
      winningDays: 5,
      losingDays: 1,
      breakevenDays: 0,
      bestDay: { date: "2026-09-12", netPnl: "600.00" },
      worstDay: { date: "2026-09-10", netPnl: "-200.00" },
      averageDailyPnl: "266.67",
      totalRisk: "800.00",
      averageR: "1.75",
    },
    days: {
      "2026-09-12": {
        date: "2026-09-12",
        tradeCount: 2,
        winCount: 2,
        lossCount: 0,
        breakevenCount: 0,
        openCount: 0,
        netPnl: "350.00",
        winRate: 100,
        totalR: "2.50",
        hasJournalEntry: true,
        journalEntryId: "entry-1",
        journalMood: "GOOD",
        journalNotes: "Great day",
        trades: [],
      },
    },
  },
};

describe("DashboardClientPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton initially and displays full dashboard upon load", async () => {
    vi.spyOn(dashboardClient, "fetchDashboardOverview").mockResolvedValue(mockDashboardData);

    render(<DashboardClientPage />);

    expect(screen.getByTestId("dashboard-skeleton")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-page")).toBeDefined();
    });

    expect(screen.getByTestId("dashboard-performance-hero")).toBeDefined();
    expect(screen.getByText("Trading Command Center")).toBeDefined();
    expect(screen.getAllByText("+$1,600.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NVDA").length).toBeGreaterThan(0);
    expect(screen.getByText("Main Futures")).toBeDefined();
    expect(screen.getByText("Quick Actions & Navigation")).toBeDefined();
  });

  it("renders empty state when user has 0 accounts and 0 trades", async () => {
    const emptyData: dashboardClient.DashboardOverviewDto = {
      ...mockDashboardData,
      performance: {
        ...mockDashboardData.performance,
        totalTrades: 0,
        netPnl: "0.00",
      },
      accounts: [],
    };

    vi.spyOn(dashboardClient, "fetchDashboardOverview").mockResolvedValue(emptyData);

    render(<DashboardClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-empty-state")).toBeDefined();
    });

    expect(screen.getByText("Get Started with Your Trading Journal")).toBeDefined();
  });

  it("renders error state on API error and retries on button click", async () => {
    const fetchSpy = vi.spyOn(dashboardClient, "fetchDashboardOverview");
    fetchSpy.mockRejectedValue(new dashboardClient.DashboardClientApiError("Database error", 500));

    render(<DashboardClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-error-state")).toBeDefined();
    });

    expect(screen.getByText("Database error")).toBeDefined();

    fetchSpy.mockResolvedValue(mockDashboardData);

    const retryBtn = screen.getByRole("button", { name: /retry loading/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-performance-hero")).toBeDefined();
    });
  });
});
