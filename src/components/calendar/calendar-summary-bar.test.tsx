// @vitest-environment happy-dom
/**
 * Calendar Domain — Summary Bar Component Tests
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { CalendarSummaryBar } from "./calendar-summary-bar";
import type { CalendarMonthSummaryDto } from "@/lib/client/calendar";

describe("CalendarSummaryBar Component", () => {
  const mockSummary: CalendarMonthSummaryDto = {
    month: "2026-09",
    totalTrades: 12,
    closedTrades: 10,
    openTrades: 2,
    winningTrades: 7,
    losingTrades: 3,
    breakevenTrades: 0,
    netPnl: "2450.00",
    grossProfit: "3100.00",
    grossLoss: "650.00",
    winRate: 70,
    profitFactor: "4.77",
    winningDays: 5,
    losingDays: 2,
    breakevenDays: 0,
    bestDay: { date: "2026-09-02", netPnl: "1200.00" },
    worstDay: { date: "2026-09-08", netPnl: "-450.00" },
    averageDailyPnl: "350.00",
    totalRisk: "1000.00",
    averageR: "1.95",
  };

  it("renders monthly KPI metrics correctly", () => {
    render(<CalendarSummaryBar summary={mockSummary} />);

    expect(screen.getByTestId("summary-net-pnl").textContent).toContain("+$2,450.00");
    expect(screen.getByTestId("summary-win-rate").textContent).toContain("70%");
    expect(screen.getByTestId("summary-avg-daily").textContent).toContain("+$350.00");
    expect(screen.getByTestId("summary-best-day").textContent).toContain("+$1,200.00");
    expect(screen.getByTestId("summary-worst-day").textContent).toContain("-$450.00");
  });

  it("handles negative overall net P&L with rose styling and minus sign", () => {
    const negativeSummary: CalendarMonthSummaryDto = {
      ...mockSummary,
      netPnl: "-850.50",
      averageDailyPnl: "-121.50",
    };

    render(<CalendarSummaryBar summary={negativeSummary} />);

    expect(screen.getByTestId("summary-net-pnl").textContent).toContain("-$850.50");
    expect(screen.getByTestId("summary-net-pnl").className).toContain("text-rose-400");
  });
});
