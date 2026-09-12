/**
 * Analytics Domain — Service & Calculation Engine Tests
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("server-only", () => ({}));
import { computeAnalytics, getAnalyticsOverview } from "./service";
import { prisma } from "@/lib/db/client";
import * as authSession from "@/lib/auth/session";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    trade: {
      findMany: vi.fn(),
    },
    tradingAccount: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

function makeTrade(overrides: Partial<Parameters<typeof computeAnalytics>[0][number]> = {}) {
  return {
    id: overrides.id ?? "trade-1",
    side: overrides.side ?? "LONG",
    status: overrides.status ?? "CLOSED",
    entryPrice: overrides.entryPrice ?? new Prisma.Decimal("100.00"),
    exitPrice: overrides.exitPrice ?? new Prisma.Decimal("105.00"),
    entryDate: overrides.entryDate ?? new Date("2025-01-01T10:00:00.000Z"),
    exitDate: overrides.exitDate ?? new Date("2025-01-01T12:00:00.000Z"),
    quantity: overrides.quantity ?? new Prisma.Decimal("10.00"),
    grossPnl: overrides.grossPnl ?? new Prisma.Decimal("50.00"),
    netPnl: overrides.netPnl ?? new Prisma.Decimal("45.00"),
    commission: overrides.commission ?? new Prisma.Decimal("3.00"),
    fees: overrides.fees ?? new Prisma.Decimal("2.00"),
    swap: overrides.swap ?? new Prisma.Decimal("0.00"),
    riskAmount: overrides.riskAmount ?? new Prisma.Decimal("20.00"),
    plannedRiskReward: overrides.plannedRiskReward ?? new Prisma.Decimal("2.50"),
    actualRMultiple: overrides.actualRMultiple ?? new Prisma.Decimal("2.25"),
    title: overrides.title ?? "AAPL",
    tradingAccountId: overrides.tradingAccountId ?? "acc-1",
    tradingAccount: overrides.tradingAccount ?? {
      id: "acc-1",
      name: "Main IBKR",
      currency: "USD",
      initialBalance: new Prisma.Decimal("10000.00"),
    },
    strategyId: overrides.strategyId ?? "strat-1",
    strategy: overrides.strategy ?? {
      id: "strat-1",
      name: "Trend Following",
    },
    setupId: overrides.setupId ?? "setup-1",
    setup: overrides.setup ?? {
      id: "setup-1",
      name: "Breakout",
    },
    tags: overrides.tags ?? [
      {
        tag: {
          id: "tag-1",
          name: "Earnings",
          color: "#ff0000",
        },
      },
    ],
    mistakes: overrides.mistakes ?? [],
  };
}

describe("Analytics Service — Calculation Engine (computeAnalytics)", () => {
  it("handles empty dataset safely without division by zero or errors", () => {
    const result = computeAnalytics([]);

    expect(result.metrics.totalTrades).toBe(0);
    expect(result.metrics.closedTrades).toBe(0);
    expect(result.metrics.openTrades).toBe(0);
    expect(result.metrics.winningTrades).toBe(0);
    expect(result.metrics.losingTrades).toBe(0);
    expect(result.metrics.breakevenTrades).toBe(0);
    expect(result.metrics.winRate).toBe(0);
    expect(result.metrics.lossRate).toBe(0);
    expect(result.metrics.grossProfit).toBe("0.00");
    expect(result.metrics.grossLoss).toBe("0.00");
    expect(result.metrics.netPnl).toBe("0.00");
    expect(result.metrics.totalCosts).toBe("0.00");
    expect(result.metrics.averageTradePnl).toBe("0.00");
    expect(result.metrics.averageWinner).toBe("0.00");
    expect(result.metrics.averageLoser).toBe("0.00");
    expect(result.metrics.largestWinner).toBe("0.00");
    expect(result.metrics.largestLoser).toBe("0.00");
    expect(result.metrics.profitFactor).toBeNull();
    expect(result.metrics.expectancy).toBe("0.00");
    expect(result.metrics.averageR).toBeNull();
    expect(result.metrics.maxDrawdown).toBe("0.00");
    expect(result.metrics.maxDrawdownPercentage).toBeNull();
    expect(result.metrics.peakEquity).toBeNull();
    expect(result.metrics.endingEquity).toBeNull();
    expect(result.metrics.winningStreak).toBe(0);
    expect(result.metrics.losingStreak).toBe(0);
    expect(result.metrics.currentStreak).toEqual({ count: 0, type: "NONE" });
    expect(result.metrics.averageHoldingDurationSeconds).toBe(0);

    expect(result.byDate).toEqual([]);
    expect(result.bySymbol).toEqual([]);
    expect(result.byStrategy).toEqual([]);
    expect(result.bySetup).toEqual([]);
    expect(result.byTag).toEqual([]);
    expect(result.byMistake).toEqual([]);
    expect(result.byAccount).toEqual([]);
    expect(result.equityCurve).toEqual([]);
  });

  it("calculates wins, losses, breakeven, and win/loss rates accurately", () => {
    const trade1 = makeTrade({
      id: "t1",
      netPnl: new Prisma.Decimal("100.00"),
      grossPnl: new Prisma.Decimal("110.00"),
    });
    const trade2 = makeTrade({
      id: "t2",
      netPnl: new Prisma.Decimal("-50.00"),
      grossPnl: new Prisma.Decimal("-40.00"),
    });
    const trade3 = makeTrade({
      id: "t3",
      netPnl: new Prisma.Decimal("0.00"),
      grossPnl: new Prisma.Decimal("10.00"),
    });
    const trade4 = makeTrade({
      id: "t4",
      netPnl: new Prisma.Decimal("300.00"),
      grossPnl: new Prisma.Decimal("310.00"),
    });

    const result = computeAnalytics([trade1, trade2, trade3, trade4]);

    expect(result.metrics.totalTrades).toBe(4);
    expect(result.metrics.closedTrades).toBe(4);
    expect(result.metrics.winningTrades).toBe(2);
    expect(result.metrics.losingTrades).toBe(1);
    expect(result.metrics.breakevenTrades).toBe(1);
    expect(result.metrics.winRate).toBe(50); // 2/4 = 50%
    expect(result.metrics.lossRate).toBe(25); // 1/4 = 25%
  });

  it("calculates profit factor, expectancy, and P&L extremes correctly", () => {
    const winner1 = makeTrade({
      id: "w1",
      grossPnl: new Prisma.Decimal("200.00"),
      netPnl: new Prisma.Decimal("190.00"),
    });
    const winner2 = makeTrade({
      id: "w2",
      grossPnl: new Prisma.Decimal("100.00"),
      netPnl: new Prisma.Decimal("90.00"),
    });
    const loser1 = makeTrade({
      id: "l1",
      grossPnl: new Prisma.Decimal("-100.00"),
      netPnl: new Prisma.Decimal("-110.00"),
    });

    const result = computeAnalytics([winner1, winner2, loser1]);

    expect(result.metrics.grossProfit).toBe("300.00");
    expect(result.metrics.grossLoss).toBe("100.00");
    expect(result.metrics.profitFactor).toBe("3.00"); // 300 / 100 = 3.00
    expect(result.metrics.netPnl).toBe("170.00"); // 190 + 90 - 110 = 170.00
    expect(result.metrics.averageTradePnl).toBe("56.67"); // 170 / 3 = 56.67
    expect(result.metrics.expectancy).toBe("56.67");
    expect(result.metrics.averageWinner).toBe("140.00"); // (190 + 90) / 2 = 140.00
    expect(result.metrics.averageLoser).toBe("-110.00"); // -110 / 1
    expect(result.metrics.largestWinner).toBe("190.00");
    expect(result.metrics.largestLoser).toBe("-110.00");
  });

  it("returns null profit factor safely when gross loss is 0", () => {
    const winner = makeTrade({
      id: "w1",
      grossPnl: new Prisma.Decimal("100.00"),
      netPnl: new Prisma.Decimal("95.00"),
    });

    const result = computeAnalytics([winner]);
    expect(result.metrics.grossProfit).toBe("100.00");
    expect(result.metrics.grossLoss).toBe("0.00");
    expect(result.metrics.profitFactor).toBeNull();
  });

  it("calculates R-multiple metrics for winning and losing subsets", () => {
    const winTrade = makeTrade({
      id: "t1",
      netPnl: new Prisma.Decimal("100.00"),
      riskAmount: new Prisma.Decimal("50.00"),
      actualRMultiple: new Prisma.Decimal("2.00"),
    });
    const lossTrade = makeTrade({
      id: "t2",
      netPnl: new Prisma.Decimal("-50.00"),
      riskAmount: new Prisma.Decimal("50.00"),
      actualRMultiple: new Prisma.Decimal("-1.00"),
    });

    const result = computeAnalytics([winTrade, lossTrade]);

    expect(result.metrics.totalRisk).toBe("100.00");
    expect(result.metrics.averageR).toBe("0.50"); // (2.00 + -1.00) / 2 = 0.50
    expect(result.metrics.averageWinningR).toBe("2.00");
    expect(result.metrics.averageLosingR).toBe("-1.00");
  });

  it("calculates streaks and current streak accurately", () => {
    const t1 = makeTrade({
      id: "t1",
      entryDate: new Date("2025-01-01T10:00:00Z"),
      exitDate: new Date("2025-01-01T11:00:00Z"),
      netPnl: new Prisma.Decimal("50.00"),
    });
    const t2 = makeTrade({
      id: "t2",
      entryDate: new Date("2025-01-02T10:00:00Z"),
      exitDate: new Date("2025-01-02T11:00:00Z"),
      netPnl: new Prisma.Decimal("70.00"),
    });
    const t3 = makeTrade({
      id: "t3",
      entryDate: new Date("2025-01-03T10:00:00Z"),
      exitDate: new Date("2025-01-03T11:00:00Z"),
      netPnl: new Prisma.Decimal("30.00"),
    });
    const t4 = makeTrade({
      id: "t4",
      entryDate: new Date("2025-01-04T10:00:00Z"),
      exitDate: new Date("2025-01-04T11:00:00Z"),
      netPnl: new Prisma.Decimal("-20.00"),
    });
    const t5 = makeTrade({
      id: "t5",
      entryDate: new Date("2025-01-05T10:00:00Z"),
      exitDate: new Date("2025-01-05T11:00:00Z"),
      netPnl: new Prisma.Decimal("-40.00"),
    });

    const result = computeAnalytics([t1, t2, t3, t4, t5]);

    expect(result.metrics.winningStreak).toBe(3);
    expect(result.metrics.losingStreak).toBe(2);
    expect(result.metrics.currentStreak).toEqual({ count: 2, type: "LOSS" });
  });

  it("calculates holding durations in seconds", () => {
    // 2 hours = 7200 seconds
    const t1 = makeTrade({
      entryDate: new Date("2025-01-01T10:00:00Z"),
      exitDate: new Date("2025-01-01T12:00:00Z"),
      netPnl: new Prisma.Decimal("50.00"),
    });
    // 4 hours = 14400 seconds
    const t2 = makeTrade({
      entryDate: new Date("2025-01-02T10:00:00Z"),
      exitDate: new Date("2025-01-02T14:00:00Z"),
      netPnl: new Prisma.Decimal("50.00"),
    });

    const result = computeAnalytics([t1, t2]);
    expect(result.metrics.totalHoldingDurationSeconds).toBe(21600); // 7200 + 14400
    expect(result.metrics.averageHoldingDurationSeconds).toBe(10800); // 21600 / 2
  });

  it("computes equity curve, peak equity, and max drawdown with initial balance", () => {
    const initialBalance = new Prisma.Decimal("10000.00");

    // Sequence of trades: +500 -> equity 10500 (peak)
    // -200 -> equity 10300 (dd 200)
    // -400 -> equity 9900 (dd 600, ddPct 600/10500 = 5.71%)
    // +1000 -> equity 10900 (new peak)
    const t1 = makeTrade({
      id: "t1",
      entryDate: new Date("2025-01-01T10:00:00Z"),
      exitDate: new Date("2025-01-01T11:00:00Z"),
      netPnl: new Prisma.Decimal("500.00"),
    });
    const t2 = makeTrade({
      id: "t2",
      entryDate: new Date("2025-01-02T10:00:00Z"),
      exitDate: new Date("2025-01-02T11:00:00Z"),
      netPnl: new Prisma.Decimal("-200.00"),
    });
    const t3 = makeTrade({
      id: "t3",
      entryDate: new Date("2025-01-03T10:00:00Z"),
      exitDate: new Date("2025-01-03T11:00:00Z"),
      netPnl: new Prisma.Decimal("-400.00"),
    });
    const t4 = makeTrade({
      id: "t4",
      entryDate: new Date("2025-01-04T10:00:00Z"),
      exitDate: new Date("2025-01-04T11:00:00Z"),
      netPnl: new Prisma.Decimal("1000.00"),
    });

    const result = computeAnalytics([t1, t2, t3, t4], initialBalance);

    expect(result.metrics.maxDrawdown).toBe("600.00");
    expect(result.metrics.maxDrawdownPercentage).toBe(5.71);
    expect(result.metrics.peakEquity).toBe("10900.00");
    expect(result.metrics.endingEquity).toBe("10900.00");

    expect(result.equityCurve).toHaveLength(4);
    expect(result.equityCurve[0].equity).toBe("10500.00");
    expect(result.equityCurve[0].drawdown).toBe("0.00");
    expect(result.equityCurve[2].equity).toBe("9900.00");
    expect(result.equityCurve[2].drawdown).toBe("600.00");
    expect(result.equityCurve[3].equity).toBe("10900.00");
    expect(result.equityCurve[3].drawdown).toBe("0.00");
  });

  it("isolates open trades so they do not fabricate realized P&L", () => {
    const closedTrade = makeTrade({
      id: "c1",
      status: "CLOSED",
      netPnl: new Prisma.Decimal("100.00"),
      riskAmount: new Prisma.Decimal("50.00"),
    });
    const openTrade = makeTrade({
      id: "o1",
      status: "OPEN",
      exitPrice: null,
      exitDate: null,
      grossPnl: null,
      netPnl: null,
      riskAmount: new Prisma.Decimal("100.00"),
    });

    const result = computeAnalytics([closedTrade, openTrade]);

    expect(result.metrics.totalTrades).toBe(2);
    expect(result.metrics.closedTrades).toBe(1);
    expect(result.metrics.openTrades).toBe(1);
    expect(result.metrics.winningTrades).toBe(1);
    expect(result.metrics.netPnl).toBe("100.00");
    expect(result.metrics.totalRisk).toBe("150.00"); // total risk includes both
  });

  it("calculates directional Long vs Short metrics", () => {
    const longWin = makeTrade({
      side: "LONG",
      netPnl: new Prisma.Decimal("200.00"),
    });
    const longLoss = makeTrade({
      side: "LONG",
      netPnl: new Prisma.Decimal("-100.00"),
    });
    const shortWin = makeTrade({
      side: "SHORT",
      netPnl: new Prisma.Decimal("150.00"),
    });

    const result = computeAnalytics([longWin, longLoss, shortWin]);

    expect(result.metrics.longTradeCount).toBe(2);
    expect(result.metrics.longNetPnl).toBe("100.00");
    expect(result.metrics.longWinRate).toBe(50); // 1 / 2 = 50%

    expect(result.metrics.shortTradeCount).toBe(1);
    expect(result.metrics.shortNetPnl).toBe("150.00");
    expect(result.metrics.shortWinRate).toBe(100);
  });

  it("groups performance by Symbol, Strategy, Setup, Tag, Mistake, and Account", () => {
    const trade1 = makeTrade({
      id: "t1",
      title: "TSLA",
      strategy: { id: "s1", name: "Momentum" },
      setup: { id: "set1", name: "Flag Breakout" },
      tags: [{ tag: { id: "tag1", name: "High Vol", color: "#ff0000" } }],
      mistakes: [{ mistake: { id: "m1", name: "FOMO" } }],
      netPnl: new Prisma.Decimal("-100.00"),
    });
    const trade2 = makeTrade({
      id: "t2",
      title: "TSLA",
      strategy: { id: "s1", name: "Momentum" },
      setup: { id: "set1", name: "Flag Breakout" },
      tags: [{ tag: { id: "tag1", name: "High Vol", color: "#ff0000" } }],
      mistakes: [],
      netPnl: new Prisma.Decimal("300.00"),
    });

    const result = computeAnalytics([trade1, trade2]);

    // Symbol grouping
    expect(result.bySymbol).toHaveLength(1);
    expect(result.bySymbol[0].symbol).toBe("TSLA");
    expect(result.bySymbol[0].tradeCount).toBe(2);
    expect(result.bySymbol[0].winRate).toBe(50);
    expect(result.bySymbol[0].netPnl).toBe("200.00");

    // Strategy grouping
    expect(result.byStrategy).toHaveLength(1);
    expect(result.byStrategy[0].strategyName).toBe("Momentum");
    expect(result.byStrategy[0].netPnl).toBe("200.00");

    // Setup grouping
    expect(result.bySetup).toHaveLength(1);
    expect(result.bySetup[0].setupName).toBe("Flag Breakout");

    // Tag grouping
    expect(result.byTag).toHaveLength(1);
    expect(result.byTag[0].tagName).toBe("High Vol");

    // Mistake grouping
    expect(result.byMistake).toHaveLength(1);
    expect(result.byMistake[0].mistakeName).toBe("FOMO");
    expect(result.byMistake[0].totalLoss).toBe("100.00");

    // Account grouping
    expect(result.byAccount).toHaveLength(1);
    expect(result.byAccount[0].accountName).toBe("Main IBKR");
  });
});

describe("Analytics Service — DB Integration & User Isolation (getAnalyticsOverview)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces user isolation by querying only the authenticated userId", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-123");
    vi.mocked(prisma.trade.findMany).mockResolvedValue([]);

    await getAnalyticsOverview({ symbol: "NVDA" }, "user-123");

    expect(prisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          title: { contains: "NVDA", mode: "insensitive" },
        }),
      }),
    );
  });

  it("throws 401 AUTH_REQUIRED when user is not authenticated", async () => {
    vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("Unauthorized"));

    await expect(getAnalyticsOverview({})).rejects.toThrow(
      expect.objectContaining({
        code: "AUTH_REQUIRED",
        httpStatus: 401,
      }),
    );
  });

  it("throws 400 VALIDATION error on invalid date range", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-123");

    await expect(
      getAnalyticsOverview(
        {
          dateFrom: new Date("2025-12-01"),
          dateTo: new Date("2025-01-01"),
        },
        "user-123",
      ),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "VALIDATION",
        httpStatus: 400,
      }),
    );
  });
});
