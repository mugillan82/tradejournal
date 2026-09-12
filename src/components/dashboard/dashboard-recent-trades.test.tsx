// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DashboardRecentTrades } from "./dashboard-recent-trades";

describe("DashboardRecentTrades Component", () => {
  it("renders empty state message when trades array is empty", () => {
    render(<DashboardRecentTrades trades={[]} />);
    expect(screen.getByText("No recent trades found. Log a trade to get started.")).toBeDefined();
  });

  it("renders recent trades list with symbol, side, status, and P&L", () => {
    const trades = [
      {
        id: "trade-1",
        userId: "user-1",
        tradingAccountId: "acc-1",
        title: "ES Long Setup",
        side: "LONG" as const,
        status: "CLOSED" as const,
        entryDate: new Date("2026-09-12T10:00:00.000Z"),
        exitDate: new Date("2026-09-12T10:30:00.000Z"),
        entryPrice: "5500.00",
        exitPrice: "5520.00",
        stopLoss: "5490.00",
        takeProfit: "5530.00",
        riskAmount: "1000.00",
        plannedRiskReward: "3.00",
        actualRMultiple: "2.00",
        quantity: "2",
        commission: "0.00",
        fees: "0.00",
        swap: "0.00",
        grossPnl: "2000.00",
        netPnl: "2000.00",
        notes: null,
        strategyId: null,
        setupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    render(<DashboardRecentTrades trades={trades} />);

    expect(screen.getByText("ES Long Setup")).toBeDefined();
    expect(screen.getByText("LONG")).toBeDefined();
    expect(screen.getByText("CLOSED")).toBeDefined();
    expect(screen.getByText("2.00R")).toBeDefined();
    expect(screen.getByText("+$2,000.00")).toBeDefined();
  });
});
