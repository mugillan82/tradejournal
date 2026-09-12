// @vitest-environment happy-dom
/**
 * Analytics Domain — KPI Grid Component Tests
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AnalyticsKpiGrid } from "./analytics-kpi-grid";
import type { CorePerformanceMetricsDto } from "@/lib/client/analytics";

const mockMetrics: CorePerformanceMetricsDto = {
  totalTrades: 12,
  closedTrades: 10,
  openTrades: 2,
  winningTrades: 7,
  losingTrades: 3,
  breakevenTrades: 0,
  winRate: 70,
  lossRate: 30,
  grossProfit: "2500.00",
  grossLoss: "800.00",
  netPnl: "1650.00",
  totalCommission: "35.00",
  totalFees: "15.00",
  totalSwap: "0.00",
  totalCosts: "50.00",
  averageTradePnl: "165.00",
  averageWinner: "357.14",
  averageLoser: "-266.67",
  largestWinner: "800.00",
  largestLoser: "-500.00",
  profitFactor: "3.13",
  expectancy: "165.00",
  totalRisk: "1200.00",
  averageR: "1.45",
  averageWinningR: "2.10",
  averageLosingR: "-0.95",
  maxDrawdown: "500.00",
  maxDrawdownPercentage: 5.0,
  peakEquity: "11650.00",
  endingEquity: "11650.00",
  winningStreak: 4,
  losingStreak: 2,
  currentStreak: { count: 3, type: "WIN" },
  averageHoldingDurationSeconds: 7200,
  totalHoldingDurationSeconds: 72000,
  longTradeCount: 6,
  shortTradeCount: 4,
  longNetPnl: "1100.00",
  shortNetPnl: "550.00",
  longWinRate: 66.67,
  shortWinRate: 75.0,
};

describe("AnalyticsKpiGrid Component", () => {
  it("renders all 8 primary KPI values accurately", () => {
    render(<AnalyticsKpiGrid metrics={mockMetrics} />);

    expect(screen.getByTestId("kpi-net-pnl").textContent).toContain("$1,650.00");
    expect(screen.getByTestId("kpi-total-trades").textContent).toBe("12");
    expect(screen.getByTestId("kpi-win-rate").textContent).toBe("70%");
    expect(screen.getByTestId("kpi-profit-factor").textContent).toBe("3.13");
    expect(screen.getByTestId("kpi-expectancy").textContent).toContain("$165.00");
    expect(screen.getByTestId("kpi-avg-trade").textContent).toContain("$165.00");
    expect(screen.getByTestId("kpi-avg-winner").textContent).toContain("$357.14");
    expect(screen.getByTestId("kpi-avg-loser").textContent).toContain("-$266.67");
  });

  it("handles negative Net P&L with rose styling and minus sign", () => {
    const losingMetrics: CorePerformanceMetricsDto = {
      ...mockMetrics,
      netPnl: "-450.00",
      averageTradePnl: "-45.00",
    };

    render(<AnalyticsKpiGrid metrics={losingMetrics} />);

    const netPnlEl = screen.getByTestId("kpi-net-pnl");
    expect(netPnlEl.textContent).toContain("-$450.00");
    expect(netPnlEl.className).toContain("text-rose-400");
  });

  it("handles zero/empty state safely without throwing", () => {
    const emptyMetrics: CorePerformanceMetricsDto = {
      totalTrades: 0,
      closedTrades: 0,
      openTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRate: 0,
      lossRate: 0,
      grossProfit: "0.00",
      grossLoss: "0.00",
      netPnl: "0.00",
      totalCommission: "0.00",
      totalFees: "0.00",
      totalSwap: "0.00",
      totalCosts: "0.00",
      averageTradePnl: "0.00",
      averageWinner: "0.00",
      averageLoser: "0.00",
      largestWinner: "0.00",
      largestLoser: "0.00",
      profitFactor: null,
      expectancy: "0.00",
      totalRisk: "0.00",
      averageR: null,
      averageWinningR: null,
      averageLosingR: null,
      maxDrawdown: "0.00",
      maxDrawdownPercentage: null,
      peakEquity: null,
      endingEquity: null,
      winningStreak: 0,
      losingStreak: 0,
      currentStreak: { count: 0, type: "NONE" },
      averageHoldingDurationSeconds: 0,
      totalHoldingDurationSeconds: 0,
      longTradeCount: 0,
      shortTradeCount: 0,
      longNetPnl: "0.00",
      shortNetPnl: "0.00",
      longWinRate: 0,
      shortWinRate: 0,
    };

    render(<AnalyticsKpiGrid metrics={emptyMetrics} />);

    expect(screen.getByTestId("kpi-net-pnl").textContent).toContain("$0.00");
    expect(screen.getByTestId("kpi-total-trades").textContent).toBe("0");
    expect(screen.getByTestId("kpi-profit-factor").textContent).toBe("—");
  });
});
