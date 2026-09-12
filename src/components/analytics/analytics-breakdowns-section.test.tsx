// @vitest-environment happy-dom
/**
 * Analytics Domain — Breakdowns Section Component Tests
 */

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { AnalyticsBreakdownsSection } from "./analytics-breakdowns-section";
import type { CorePerformanceMetricsDto } from "@/lib/client/analytics";

const mockMetrics: CorePerformanceMetricsDto = {
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
  netPnl: "600.00",
  totalCommission: "0.00",
  totalFees: "0.00",
  totalSwap: "0.00",
  totalCosts: "0.00",
  averageTradePnl: "120.00",
  averageWinner: "333.33",
  averageLoser: "-200.00",
  largestWinner: "500.00",
  largestLoser: "-300.00",
  profitFactor: "2.50",
  expectancy: "120.00",
  totalRisk: "500.00",
  averageR: "1.20",
  averageWinningR: "2.00",
  averageLosingR: "-1.00",
  maxDrawdown: "300.00",
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
  longNetPnl: "450.00",
  shortNetPnl: "150.00",
  longWinRate: 66.67,
  shortWinRate: 50.0,
};

const mockSymbolData = [
  {
    symbol: "NVDA",
    tradeCount: 3,
    winCount: 2,
    lossCount: 1,
    netPnl: "400.00",
    winRate: 66.67,
    profitFactor: "3.00",
  },
];

const mockStrategyData = [
  {
    strategyId: "s-1",
    strategyName: "Gap and Go",
    tradeCount: 2,
    winCount: 2,
    lossCount: 0,
    netPnl: "500.00",
    winRate: 100,
  },
];

describe("AnalyticsBreakdownsSection Component", () => {
  it("renders the active Symbol breakdown tab by default", () => {
    render(
      <AnalyticsBreakdownsSection
        metrics={mockMetrics}
        byDate={[]}
        bySymbol={mockSymbolData}
        byStrategy={mockStrategyData}
        bySetup={[]}
        byTag={[]}
        byMistake={[]}
        byAccount={[]}
      />,
    );

    expect(screen.getByTestId("analytics-breakdowns-section")).toBeDefined();
    expect(screen.getByText("NVDA")).toBeDefined();
    expect(screen.getByText("$400.00")).toBeDefined();
  });

  it("switches to Strategy tab and renders strategy breakdown", () => {
    render(
      <AnalyticsBreakdownsSection
        metrics={mockMetrics}
        byDate={[]}
        bySymbol={mockSymbolData}
        byStrategy={mockStrategyData}
        bySetup={[]}
        byTag={[]}
        byMistake={[]}
        byAccount={[]}
      />,
    );

    const strategyTabBtn = screen.getByTestId("breakdown-tab-strategy");
    fireEvent.click(strategyTabBtn);

    expect(screen.getByText("Gap and Go")).toBeDefined();
    expect(screen.getByText("$500.00")).toBeDefined();
  });

  it("switches to Long vs Short tab and displays directional cards", () => {
    render(
      <AnalyticsBreakdownsSection
        metrics={mockMetrics}
        byDate={[]}
        bySymbol={mockSymbolData}
        byStrategy={mockStrategyData}
        bySetup={[]}
        byTag={[]}
        byMistake={[]}
        byAccount={[]}
      />,
    );

    const directionTabBtn = screen.getByTestId("breakdown-tab-direction");
    fireEvent.click(directionTabBtn);

    expect(screen.getByText("Long Trades")).toBeDefined();
    expect(screen.getByText("Short Trades")).toBeDefined();
    expect(screen.getByText("$450.00")).toBeDefined();
    expect(screen.getByText("$150.00")).toBeDefined();
  });
});
