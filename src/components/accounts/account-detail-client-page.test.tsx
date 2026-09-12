// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AccountDetailClientPage } from "./account-detail-client-page";
import * as accountsClient from "@/lib/client/accounts";
import * as analyticsClient from "@/lib/client/analytics";
import * as tradesClient from "@/lib/client/trades";
import type { TradingAccountDto } from "@/lib/client/accounts";
import type { AnalyticsOverviewDto } from "@/lib/client/analytics";
import type { TradeDto } from "@/lib/trading/trade/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/client/accounts", async () => {
  const actual = await vi.importActual<typeof accountsClient>("@/lib/client/accounts");
  return {
    ...actual,
    getTradingAccountClient: vi.fn(),
    updateTradingAccountClient: vi.fn(),
    deleteTradingAccountClient: vi.fn(),
  };
});

vi.mock("@/lib/client/analytics", () => ({
  fetchAnalyticsOverview: vi.fn(),
}));

vi.mock("@/lib/client/trades", () => ({
  fetchTrades: vi.fn(),
}));

const mockAccount: TradingAccountDto = {
  id: "acc-1",
  userId: "user-1",
  name: "Topstep 50k Prop",
  type: "SIMULATION",
  currency: "USD",
  initialBalance: "50000.00",
  currentBalance: "54200.00",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
};

const mockAnalytics = {
  metrics: {
    netPnl: "4200.00",
    grossProfit: "6000.00",
    grossLoss: "1800.00",
    totalTrades: 12,
    closedTrades: 12,
    openTrades: 0,
    winningTrades: 8,
    losingTrades: 4,
    breakevenTrades: 0,
    winRate: 66.7,
    lossRate: 33.3,
    profitFactor: "3.33",
    expectancy: "350.00",
    averageWinner: "750.00",
    averageLoser: "450.00",
    averageTradePnl: "350.00",
    totalCommission: "0.00",
    totalFees: "0.00",
    totalSwap: "0.00",
    totalCosts: "0.00",
    totalRisk: "1200.00",
    largestWinner: "1200.00",
    largestLoser: "500.00",
    maxDrawdown: "500.00",
    averageR: "1.75",
    averageWinningR: "2.50",
    averageLosingR: "1.00",
  },
  equityCurve: [
    {
      tradeId: "t-1",
      exitDate: "2026-01-02T10:00:00Z",
      cumulativePnl: "1000.00",
      netPnl: "1000.00",
      equity: "51000.00",
      drawdown: "0.00",
    },
    {
      tradeId: "t-2",
      exitDate: "2026-01-03T10:00:00Z",
      cumulativePnl: "4200.00",
      netPnl: "3200.00",
      equity: "54200.00",
      drawdown: "0.00",
    },
  ],
};

const mockTrades: Partial<TradeDto>[] = [
  {
    id: "trade-1",
    title: "ES Long Breakout",
    side: "LONG",
    entryPrice: "5000.00",
    exitPrice: "5020.00",
    entryDate: new Date("2026-01-03T09:30:00Z"),
    exitDate: new Date("2026-01-03T11:00:00Z"),
    netPnl: "1000.00",
    actualRMultiple: "2.00",
    status: "CLOSED",
    userId: "user-1",
    tradingAccountId: "acc-1",
  },
];

describe("AccountDetailClientPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially and then displays account details and analytics", async () => {
    vi.mocked(accountsClient.getTradingAccountClient).mockResolvedValue(mockAccount);
    vi.mocked(analyticsClient.fetchAnalyticsOverview).mockResolvedValue(
      mockAnalytics as unknown as AnalyticsOverviewDto,
    );
    vi.mocked(tradesClient.fetchTrades).mockResolvedValue({
      items: mockTrades as TradeDto[],
      total: 1,
      page: 1,
      pageSize: 5,
    });

    render(<AccountDetailClientPage id="acc-1" />);

    expect(screen.getByLabelText("Loading account...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Topstep 50k Prop")).toBeDefined();
    });

    // Check account balances
    expect(screen.getByText("Initial Balance")).toBeDefined();
    expect(screen.getByText("Current Balance")).toBeDefined();

    // Check analytics metrics
    expect(screen.getByText("Trading Performance")).toBeDefined();
    expect(screen.getByText("+4200.00")).toBeDefined();
    expect(screen.getByText("66.7%")).toBeDefined();
    expect(screen.getByText("3.33")).toBeDefined();

    // Check recent trades
    expect(screen.getByText("ES Long Breakout")).toBeDefined();
  });

  it("handles account not found error gracefully", async () => {
    vi.mocked(accountsClient.getTradingAccountClient).mockRejectedValue(
      new accountsClient.TradingAccountClientApiError("TradingAccount not found", 404, "NOT_FOUND"),
    );

    render(<AccountDetailClientPage id="non-existent" />);

    await waitFor(() => {
      expect(screen.getByText("Trading account not found.")).toBeDefined();
    });
  });
});
