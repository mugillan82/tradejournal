// @vitest-environment happy-dom
/**
 * Trade Table Component Tests
 */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TradeTable } from "./trade-table";
import type { TradeDto } from "@/lib/trading/trade/types";
import type { TradingAccountDto } from "@/lib/trading/account/types";

describe("TradeTable Component", () => {
  const mockAccounts: TradingAccountDto[] = [
    {
      id: "acc_1",
      userId: "user_1",
      name: "Main Prop Account",
      type: "PROP_FIRM",
      currency: "USD",
      initialBalance: "50000.00",
      currentBalance: "53200.00",
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockTrades: TradeDto[] = [
    {
      id: "trade_1",
      userId: "user_1",
      tradingAccountId: "acc_1",
      side: "LONG",
      status: "CLOSED",
      entryPrice: "100.00",
      entryDate: new Date("2026-03-01T10:00:00Z"),
      exitPrice: "110.00",
      exitDate: new Date("2026-03-01T11:00:00Z"),
      stopLoss: "95.00",
      takeProfit: "110.00",
      riskAmount: "200.00",
      plannedRiskReward: "2.00",
      actualRMultiple: "2.00",
      quantity: "40",
      grossPnl: "400.00",
      netPnl: "395.00",
      commission: "5.00",
      swap: "0.00",
      symbol: "NVDA",
      setupId: null,
      notes: null,
      rating: 4,
      reviewStatus: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "trade_2",
      userId: "user_1",
      tradingAccountId: "acc_1",
      side: "SHORT",
      status: "OPEN",
      entryPrice: "200.00",
      entryDate: new Date("2026-03-02T10:00:00Z"),
      exitPrice: null,
      exitDate: null,
      stopLoss: "205.00",
      takeProfit: "190.00",
      riskAmount: "250.00",
      plannedRiskReward: "2.00",
      actualRMultiple: null,
      quantity: "50",
      grossPnl: null,
      netPnl: null,
      commission: "5.00",
      swap: "0.00",
      symbol: "TSLA",
      setupId: null,
      notes: null,
      rating: null,
      reviewStatus: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const defaultProps = {
    trades: mockTrades,
    accounts: mockAccounts,
    sortField: "entryDate" as const,
    sortDirection: "desc" as const,
    onSortChange: vi.fn(),
    selectedTradeIds: new Set<string>(),
    onToggleSelectTrade: vi.fn(),
    onToggleSelectAll: vi.fn(),
    onDeleteTrade: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders table with trade rows and accounts", () => {
    render(<TradeTable {...defaultProps} />);
    expect(screen.getByText("Trade #trade_1")).toBeDefined();
    expect(screen.getByText("Trade #trade_2")).toBeDefined();
    expect(screen.getAllByText("Main Prop Account").length).toBeGreaterThan(0);
  });

  it("triggers onToggleSelectAll when clicking header select-all checkbox", async () => {
    const user = userEvent.setup();
    render(<TradeTable {...defaultProps} />);

    const selectAllCheckbox = screen.getByTestId("select-all-trades-checkbox");
    await user.click(selectAllCheckbox);

    expect(defaultProps.onToggleSelectAll).toHaveBeenCalledTimes(1);
  });

  it("triggers onToggleSelectTrade when clicking row checkbox", async () => {
    const user = userEvent.setup();
    render(<TradeTable {...defaultProps} />);

    const rowCheckbox = screen.getByTestId("select-trade-checkbox-trade_1");
    await user.click(rowCheckbox);

    expect(defaultProps.onToggleSelectTrade).toHaveBeenCalledWith("trade_1");
  });

  it("triggers onDeleteTrade when clicking row delete button", async () => {
    const user = userEvent.setup();
    render(<TradeTable {...defaultProps} />);

    const deleteBtn = screen.getByTestId("delete-trade-btn-trade_1");
    await user.click(deleteBtn);

    expect(defaultProps.onDeleteTrade).toHaveBeenCalledWith(mockTrades[0]);
  });
});
