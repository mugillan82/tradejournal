// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DashboardPerformanceHero } from "./dashboard-performance-hero";
import type { CorePerformanceMetricsDto } from "@/lib/client/dashboard";

describe("DashboardPerformanceHero Component", () => {
  it("renders key financial metrics accurately with positive P&L", () => {
    const metrics = {
      netPnl: "3500.00",
      totalTrades: 20,
      winningTrades: 14,
      losingTrades: 6,
      breakevenTrades: 0,
      winRate: 70,
      lossRate: 30,
      profitFactor: "2.85",
      expectancy: "175.00",
      averageR: "1.65",
      peakEquity: "4000.00",
      maxDrawdown: "500.00",
      maxDrawdownPercentage: 12.5,
    } as unknown as CorePerformanceMetricsDto;

    render(<DashboardPerformanceHero metrics={metrics} equityCurve={[]} />);

    expect(screen.getByText("+$3,500.00")).toBeDefined();
    expect(screen.getByText("70%")).toBeDefined();
    expect(screen.getByText("2.85")).toBeDefined();
    expect(screen.getByText("+$175.00")).toBeDefined();
    expect(screen.getByText("20 Total Closed Trades")).toBeDefined();
  });

  it("handles negative Net P&L safely with minus format and rose styling", () => {
    const metrics = {
      netPnl: "-1200.00",
      totalTrades: 10,
      winningTrades: 3,
      losingTrades: 7,
      breakevenTrades: 0,
      winRate: 30,
      lossRate: 70,
      profitFactor: "0.55",
      expectancy: "-120.00",
      averageR: "-0.45",
      peakEquity: "500.00",
      maxDrawdown: "1700.00",
      maxDrawdownPercentage: 25,
    } as unknown as CorePerformanceMetricsDto;

    render(<DashboardPerformanceHero metrics={metrics} equityCurve={[]} />);

    expect(screen.getByText("-$1,200.00")).toBeDefined();
    expect(screen.getByText("30%")).toBeDefined();
    expect(screen.getByText("-$120.00")).toBeDefined();
  });
});
