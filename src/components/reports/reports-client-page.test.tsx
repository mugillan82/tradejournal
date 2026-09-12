// @vitest-environment happy-dom
/**
 * Reports Domain — Client Page Integration Tests
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { ReportsClientPage } from "./reports-client-page";
import * as reportsClient from "@/lib/client/reports";
import * as analyticsClient from "@/lib/client/analytics";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/reports",
}));

const mockReportData: reportsClient.ReportOverviewDto = {
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
  equityCurve: [
    { tradeId: "t-1", exitDate: "2026-01-01T10:00:00Z", netPnl: "300.00", cumulativePnl: "300.00", equity: "10300.00", drawdown: "0.00" },
    { tradeId: "t-2", exitDate: "2026-01-02T10:00:00Z", netPnl: "1050.00", cumulativePnl: "1350.00", equity: "11350.00", drawdown: "0.00" },
  ],
  symbols: [
    { symbol: "AAPL", tradeCount: 5, winCount: 3, lossCount: 2, netPnl: "800.00", winRate: 60, averageTradePnl: "160.00", grossProfit: "1200.00", grossLoss: "400.00", profitFactor: "3.00", averageR: "1.80" },
  ],
  strategies: [
    { strategyId: "s-1", strategyName: "Trend Follow", tradeCount: 4, winCount: 3, lossCount: 1, netPnl: "700.00", winRate: 75, averageTradePnl: "175.00", expectancy: "175.00", averageR: "2.10" },
  ],
  setups: [
    { setupId: "set-1", setupName: "Bull Flag", tradeCount: 3, winCount: 2, lossCount: 1, netPnl: "500.00", winRate: 66.7, averageTradePnl: "166.67", expectancy: "166.67", averageR: "1.90" },
  ],
  tags: [
    { tagId: "t-1", tagName: "High Vol", tagColor: "#ff0000", tradeCount: 3, winCount: 2, lossCount: 1, netPnl: "450.00", winRate: 66.7, averageTradePnl: "150.00", averageR: "1.50" },
  ],
  mistakes: [
    { mistakeId: "m-1", mistakeName: "Chasing", tradeCount: 1, winCount: 0, lossCount: 1, netPnl: "-200.00", totalLoss: "200.00", averageLoss: "200.00", winRate: 0 },
  ],
  accounts: [
    { tradingAccountId: "acc-1", accountName: "Main IBKR", currency: "USD", tradeCount: 8, winCount: 5, lossCount: 3, netPnl: "1350.00", winRate: 62.5, averageTradePnl: "168.75" },
  ],
  direction: {
    long: { tradeCount: 5, winCount: 3, lossCount: 2, netPnl: "900.00", winRate: 60, averageTradePnl: "180.00", grossProfit: "1200.00", grossLoss: "300.00", averageR: "1.80" },
    short: { tradeCount: 3, winCount: 2, lossCount: 1, netPnl: "450.00", winRate: 66.67, averageTradePnl: "150.00", grossProfit: "800.00", grossLoss: "350.00", averageR: "1.20" },
  },
  time: {
    daily: [
      { date: "2026-01-02", tradeCount: 4, winCount: 3, lossCount: 1, netPnl: "650.00", winRate: 75, averageTradePnl: "162.50" },
    ],
    monthly: [
      { month: "2026-01", tradeCount: 8, winCount: 5, lossCount: 3, netPnl: "1350.00", winRate: 62.5, averageTradePnl: "168.75" },
    ],
  },
};

describe("ReportsClientPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton initially and displays full reports dashboard upon data load", async () => {
    vi.spyOn(reportsClient, "fetchReportOverview").mockResolvedValue(mockReportData);
    vi.spyOn(analyticsClient, "fetchFilterOptions").mockResolvedValue({
      accounts: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
    });

    render(<ReportsClientPage />);

    expect(screen.getByTestId("reports-skeleton")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByTestId("reports-page")).toBeDefined();
    });

    expect(screen.getByTestId("reports-header")).toBeDefined();
    expect(screen.getByTestId("reports-tab-navigation")).toBeDefined();
    expect(screen.getByTestId("report-overview-tab")).toBeDefined();
    expect(screen.getByTestId("kpi-net-pnl").textContent).toContain("$1,350.00");
  });

  it("switches tabs and displays corresponding report tables", async () => {
    vi.spyOn(reportsClient, "fetchReportOverview").mockResolvedValue(mockReportData);
    vi.spyOn(analyticsClient, "fetchFilterOptions").mockResolvedValue({
      accounts: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
    });

    render(<ReportsClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("reports-page")).toBeDefined();
    });

    // Switch to Symbols tab
    fireEvent.click(screen.getByTestId("report-tab-symbols"));
    expect(screen.getByTestId("report-symbols-table")).toBeDefined();
    expect(screen.getByText("AAPL")).toBeDefined();

    // Switch to Strategies tab
    fireEvent.click(screen.getByTestId("report-tab-strategies"));
    expect(screen.getByTestId("report-strategies-table")).toBeDefined();
    expect(screen.getByText("Trend Follow")).toBeDefined();

    // Switch to Direction tab
    fireEvent.click(screen.getByTestId("report-tab-direction"));
    expect(screen.getByTestId("report-direction-tab")).toBeDefined();
    expect(screen.getByTestId("direction-long-net-pnl").textContent).toContain("+$900.00");

    // Switch to Time tab
    fireEvent.click(screen.getByTestId("report-tab-time"));
    expect(screen.getByTestId("report-time-tab")).toBeDefined();
  });

  it("renders empty state when totalTrades is 0", async () => {
    const emptyReport: reportsClient.ReportOverviewDto = {
      ...mockReportData,
      performance: {
        ...mockReportData.performance,
        totalTrades: 0,
        closedTrades: 0,
        openTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        netPnl: "0.00",
      },
      symbols: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
      accounts: [],
      time: { daily: [], monthly: [] },
    };

    vi.spyOn(reportsClient, "fetchReportOverview").mockResolvedValue(emptyReport);
    vi.spyOn(analyticsClient, "fetchFilterOptions").mockResolvedValue({
      accounts: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
    });

    render(<ReportsClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("reports-empty-state")).toBeDefined();
    });

    expect(screen.getByText("No Trading Data Recorded")).toBeDefined();
  });

  it("renders error state on API failure and retries on button click", async () => {
    const fetchSpy = vi
      .spyOn(reportsClient, "fetchReportOverview")
      .mockRejectedValueOnce(new reportsClient.ReportClientApiError("Network timeout", 500))
      .mockResolvedValueOnce(mockReportData);

    vi.spyOn(analyticsClient, "fetchFilterOptions").mockResolvedValue({
      accounts: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
    });

    render(<ReportsClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("reports-error-state")).toBeDefined();
    });

    expect(screen.getByText("Network timeout")).toBeDefined();

    const retryBtn = screen.getByTestId("reports-retry-btn");
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId("reports-page")).toBeDefined();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
