// @vitest-environment happy-dom
/**
 * Analytics Domain — Analytics Client Page Integration Tests
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { AnalyticsClientPage } from "./analytics-client-page";
import * as analyticsClient from "@/lib/client/analytics";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/analytics",
}));

const mockOverview: analyticsClient.AnalyticsOverviewDto = {
  metrics: {
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
  byDate: [{ date: "2025-01-01", tradeCount: 2, winCount: 1, lossCount: 1, netPnl: "150.00", winRate: 50 }],
  bySymbol: [{ symbol: "AAPL", tradeCount: 5, winCount: 3, lossCount: 2, netPnl: "800.00", winRate: 60, profitFactor: "2.8" }],
  byStrategy: [{ strategyId: "s-1", strategyName: "Trend", tradeCount: 4, winCount: 3, lossCount: 1, netPnl: "700.00", winRate: 75 }],
  bySetup: [{ setupId: "set-1", setupName: "Breakout", tradeCount: 3, winCount: 2, lossCount: 1, netPnl: "500.00", winRate: 66.7 }],
  byTag: [{ tagId: "t-1", tagName: "High Vol", tagColor: "#ff0000", tradeCount: 3, winCount: 2, lossCount: 1, netPnl: "450.00", winRate: 66.7 }],
  byMistake: [{ mistakeId: "m-1", mistakeName: "Chasing", tradeCount: 1, netPnl: "-200.00", totalLoss: "200.00" }],
  byAccount: [{ tradingAccountId: "acc-1", accountName: "Main", currency: "USD", tradeCount: 8, netPnl: "1350.00", winRate: 62.5 }],
  equityCurve: [
    { tradeId: "t-1", exitDate: "2025-01-01T10:00:00Z", netPnl: "300.00", cumulativePnl: "300.00", equity: "10300.00", drawdown: "0.00" },
    { tradeId: "t-2", exitDate: "2025-01-02T10:00:00Z", netPnl: "1050.00", cumulativePnl: "1350.00", equity: "11350.00", drawdown: "0.00" },
  ],
};

describe("AnalyticsClientPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton initially and displays full analytics dashboard upon data load", async () => {
    vi.spyOn(analyticsClient, "fetchAnalyticsOverview").mockResolvedValue(mockOverview);
    vi.spyOn(analyticsClient, "fetchFilterOptions").mockResolvedValue({
      accounts: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
    });

    render(<AnalyticsClientPage />);

    expect(screen.getByTestId("analytics-skeleton")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByTestId("analytics-page")).toBeDefined();
    });

    expect(screen.getByText("Analytics & Performance")).toBeDefined();
    expect(screen.getByTestId("kpi-net-pnl").textContent).toContain("$1,350.00");
    expect(screen.getByTestId("analytics-performance-chart")).toBeDefined();
    expect(screen.getByTestId("analytics-summary-cards")).toBeDefined();
    expect(screen.getByTestId("analytics-breakdowns-section")).toBeDefined();
  });

  it("renders empty state when totalTrades is 0", async () => {
    const emptyOverview: analyticsClient.AnalyticsOverviewDto = {
      ...mockOverview,
      metrics: {
        ...mockOverview.metrics,
        totalTrades: 0,
        closedTrades: 0,
        openTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        netPnl: "0.00",
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

    vi.spyOn(analyticsClient, "fetchAnalyticsOverview").mockResolvedValue(emptyOverview);
    vi.spyOn(analyticsClient, "fetchFilterOptions").mockResolvedValue({
      accounts: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
    });

    render(<AnalyticsClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("analytics-empty-state")).toBeDefined();
    });

    expect(screen.getByText("No Trading Data Yet")).toBeDefined();
  });

  it("renders error state on API failure and retries on button click", async () => {
    const fetchSpy = vi
      .spyOn(analyticsClient, "fetchAnalyticsOverview")
      .mockRejectedValueOnce(new analyticsClient.AnalyticsClientApiError("Network timeout", 500))
      .mockResolvedValueOnce(mockOverview);

    vi.spyOn(analyticsClient, "fetchFilterOptions").mockResolvedValue({
      accounts: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
    });

    render(<AnalyticsClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("analytics-error-state")).toBeDefined();
    });

    expect(screen.getByText("Network timeout")).toBeDefined();

    const retryBtn = screen.getByTestId("analytics-retry-btn");
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId("kpi-net-pnl").textContent).toContain("$1,350.00");
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
