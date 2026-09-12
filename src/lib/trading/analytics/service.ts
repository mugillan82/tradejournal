/**
 * Analytics Domain — Service Layer
 *
 * Server-only calculation engine and data aggregation service.
 *
 * Guarantees:
 * - Strict per-user isolation on all database queries.
 * - Exact financial precision using Prisma.Decimal arithmetic.
 * - Realized performance metrics computed strictly from CLOSED trades.
 * - Zero-denominator and empty-state safety.
 * - Deterministic, timezone-safe calculations.
 *
 * SECURITY: This module must not be imported from client components.
 */

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireServerUserId } from "@/lib/auth/session";

import type {
  AnalyticsFilterInput,
  AnalyticsOverviewDto,
  CorePerformanceMetricsDto,
  DecimalString,
  EquityCurvePointDto,
  PerformanceByAccountItemDto,
  PerformanceByDateItemDto,
  PerformanceByMistakeItemDto,
  PerformanceBySetupItemDto,
  PerformanceByStrategyItemDto,
  PerformanceBySymbolItemDto,
  PerformanceByTagItemDto,
} from "./types";
import { validateAnalyticsFilterInput } from "./validation";
import {
  createAuthRequiredError,
  createDatabaseError,
  createValidationError,
} from "./errors";

const ZERO_DECIMAL = new Prisma.Decimal(0);
const ZERO_STR = "0.00";

function roundRate(num: number): number {
  return Math.round(num * 100) / 100;
}

function formatDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Computes analytics overview for an authenticated user.
 */
export async function getAnalyticsOverview(
  rawFilters?: AnalyticsFilterInput,
  sessionUserId?: string,
): Promise<AnalyticsOverviewDto> {
  let userId = sessionUserId;
  if (!userId) {
    try {
      userId = await requireServerUserId();
    } catch {
      throw createAuthRequiredError();
    }
  }

  const validation = validateAnalyticsFilterInput(rawFilters);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const filters = validation.sanitizedFilter ?? {};

  // Build user-scoped Prisma where clause
  const where: Prisma.TradeWhereInput = {
    userId,
  };

  if (filters.tradingAccountId) {
    where.tradingAccountId = filters.tradingAccountId;
  }

  if (filters.side) {
    where.side = filters.side;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.symbol) {
    where.title = {
      contains: filters.symbol,
      mode: "insensitive",
    };
  }

  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }

  if (filters.setupId) {
    where.setupId = filters.setupId;
  }

  if (filters.tagId) {
    where.tags = {
      some: { tagId: filters.tagId },
    };
  }

  if (filters.mistakeId) {
    where.mistakes = {
      some: { mistakeId: filters.mistakeId },
    };
  }

  if (filters.dateFrom || filters.dateTo) {
    const entryDateFilter: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) {
      entryDateFilter.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      entryDateFilter.lte = filters.dateTo;
    }
    where.entryDate = entryDateFilter;
  }

  try {
    // 1. Fetch matching trades with minimal required relation fields
    const trades = await prisma.trade.findMany({
      where,
      select: {
        id: true,
        side: true,
        status: true,
        entryPrice: true,
        exitPrice: true,
        entryDate: true,
        exitDate: true,
        quantity: true,
        grossPnl: true,
        netPnl: true,
        commission: true,
        fees: true,
        swap: true,
        riskAmount: true,
        plannedRiskReward: true,
        actualRMultiple: true,
        title: true,
        tradingAccountId: true,
        tradingAccount: {
          select: {
            id: true,
            name: true,
            currency: true,
            initialBalance: true,
          },
        },
        strategyId: true,
        strategy: {
          select: {
            id: true,
            name: true,
          },
        },
        setupId: true,
        setup: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        mistakes: {
          select: {
            mistake: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ entryDate: "asc" }, { id: "asc" }],
    });

    // 2. Fetch single account balance if tradingAccountId is specified
    let singleAccountInitialBalance: Prisma.Decimal | null = null;
    if (filters.tradingAccountId) {
      const account = await prisma.tradingAccount.findFirst({
        where: { id: filters.tradingAccountId, userId },
        select: { initialBalance: true },
      });
      if (account?.initialBalance) {
        singleAccountInitialBalance = account.initialBalance;
      }
    }

    return computeAnalytics(trades, singleAccountInitialBalance);
  } catch (err) {
    if (err instanceof Error && err.name === "AnalyticsServiceError") {
      throw err;
    }
    throw createDatabaseError(err);
  }
}

type TradeRecord = {
  id: string;
  side: "LONG" | "SHORT";
  status: "OPEN" | "CLOSED" | "CANCELLED";
  entryPrice: Prisma.Decimal;
  exitPrice: Prisma.Decimal | null;
  entryDate: Date;
  exitDate: Date | null;
  quantity: Prisma.Decimal;
  grossPnl: Prisma.Decimal | null;
  netPnl: Prisma.Decimal | null;
  commission: Prisma.Decimal | null;
  fees: Prisma.Decimal | null;
  swap: Prisma.Decimal | null;
  riskAmount: Prisma.Decimal | null;
  plannedRiskReward: Prisma.Decimal | null;
  actualRMultiple: Prisma.Decimal | null;
  title: string | null;
  tradingAccountId: string;
  tradingAccount: {
    id: string;
    name: string;
    currency: string;
    initialBalance: Prisma.Decimal | null;
  };
  strategyId: string | null;
  strategy: {
    id: string;
    name: string;
  } | null;
  setupId: string | null;
  setup: {
    id: string;
    name: string;
  } | null;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
  mistakes: Array<{
    mistake: {
      id: string;
      name: string;
    };
  }>;
};

/**
 * Pure calculation engine for trade analytics.
 * Exported for comprehensive unit testing without database calls.
 */
export function computeAnalytics(
  trades: ReadonlyArray<TradeRecord>,
  accountInitialBalance: Prisma.Decimal | null = null,
): AnalyticsOverviewDto {
  const totalTrades = trades.length;
  const openTradesList = trades.filter((t) => t.status === "OPEN");
  const closedTradesList = trades.filter((t) => t.status === "CLOSED");

  const openTradesCount = openTradesList.length;
  const closedTradesCount = closedTradesList.length;

  // Empty state handling
  if (totalTrades === 0) {
    return {
      metrics: {
        totalTrades: 0,
        closedTrades: 0,
        openTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakevenTrades: 0,
        winRate: 0,
        lossRate: 0,
        grossProfit: ZERO_STR,
        grossLoss: ZERO_STR,
        netPnl: ZERO_STR,
        totalCommission: ZERO_STR,
        totalFees: ZERO_STR,
        totalSwap: ZERO_STR,
        totalCosts: ZERO_STR,
        averageTradePnl: ZERO_STR,
        averageWinner: ZERO_STR,
        averageLoser: ZERO_STR,
        largestWinner: ZERO_STR,
        largestLoser: ZERO_STR,
        profitFactor: null,
        expectancy: ZERO_STR,
        totalRisk: ZERO_STR,
        averageR: null,
        averageWinningR: null,
        averageLosingR: null,
        maxDrawdown: ZERO_STR,
        maxDrawdownPercentage: accountInitialBalance ? 0 : null,
        peakEquity: accountInitialBalance ? accountInitialBalance.toFixed(2) : null,
        endingEquity: accountInitialBalance ? accountInitialBalance.toFixed(2) : null,
        winningStreak: 0,
        losingStreak: 0,
        currentStreak: { count: 0, type: "NONE" },
        averageHoldingDurationSeconds: 0,
        totalHoldingDurationSeconds: 0,
        longTradeCount: 0,
        shortTradeCount: 0,
        longNetPnl: ZERO_STR,
        shortNetPnl: ZERO_STR,
        longWinRate: 0,
        shortWinRate: 0,
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
  }

  // Realized performance calculations on CLOSED trades
  let winningCount = 0;
  let losingCount = 0;
  let breakevenCount = 0;

  let grossProfit = ZERO_DECIMAL;
  let grossLoss = ZERO_DECIMAL;
  let totalNetPnl = ZERO_DECIMAL;
  let totalCommission = ZERO_DECIMAL;
  let totalFees = ZERO_DECIMAL;
  let totalSwap = ZERO_DECIMAL;

  let sumWinningNetPnl = ZERO_DECIMAL;
  let sumLosingNetPnl = ZERO_DECIMAL;

  let largestWinner: Prisma.Decimal | null = null;
  let largestLoser: Prisma.Decimal | null = null;

  let totalHoldingSeconds = 0;
  let holdingTradesCount = 0;

  let longCount = 0;
  let longWins = 0;
  let longNetPnl = ZERO_DECIMAL;

  let shortCount = 0;
  let shortWins = 0;
  let shortNetPnl = ZERO_DECIMAL;

  let sumRMultiple = ZERO_DECIMAL;
  let countRMultiple = 0;

  let sumWinningR = ZERO_DECIMAL;
  let countWinningR = 0;

  let sumLosingR = ZERO_DECIMAL;
  let countLosingR = 0;

  for (const trade of closedTradesList) {
    const netPnl = trade.netPnl ?? ZERO_DECIMAL;
    const grossPnl = trade.grossPnl ?? netPnl;
    const comm = trade.commission ?? ZERO_DECIMAL;
    const fees = trade.fees ?? ZERO_DECIMAL;
    const swap = trade.swap ?? ZERO_DECIMAL;

    totalNetPnl = totalNetPnl.plus(netPnl);
    totalCommission = totalCommission.plus(comm);
    totalFees = totalFees.plus(fees);
    totalSwap = totalSwap.plus(swap);

    // Directional counts & P&L
    if (trade.side === "LONG") {
      longCount++;
      longNetPnl = longNetPnl.plus(netPnl);
      if (netPnl.greaterThan(0)) longWins++;
    } else if (trade.side === "SHORT") {
      shortCount++;
      shortNetPnl = shortNetPnl.plus(netPnl);
      if (netPnl.greaterThan(0)) shortWins++;
    }

    // Win / Loss / Breakeven
    if (netPnl.greaterThan(0)) {
      winningCount++;
      sumWinningNetPnl = sumWinningNetPnl.plus(netPnl);
      if (grossPnl.greaterThan(0)) {
        grossProfit = grossProfit.plus(grossPnl);
      } else {
        grossProfit = grossProfit.plus(netPnl);
      }

      if (largestWinner === null || netPnl.greaterThan(largestWinner)) {
        largestWinner = netPnl;
      }

      if (trade.actualRMultiple !== null) {
        sumWinningR = sumWinningR.plus(trade.actualRMultiple);
        countWinningR++;
      }
    } else if (netPnl.lessThan(0)) {
      losingCount++;
      sumLosingNetPnl = sumLosingNetPnl.plus(netPnl);
      if (grossPnl.lessThan(0)) {
        grossLoss = grossLoss.plus(grossPnl.abs());
      } else {
        grossLoss = grossLoss.plus(netPnl.abs());
      }

      if (largestLoser === null || netPnl.lessThan(largestLoser)) {
        largestLoser = netPnl;
      }

      if (trade.actualRMultiple !== null) {
        sumLosingR = sumLosingR.plus(trade.actualRMultiple);
        countLosingR++;
      }
    } else {
      breakevenCount++;
    }

    // R-Multiple
    if (trade.actualRMultiple !== null) {
      sumRMultiple = sumRMultiple.plus(trade.actualRMultiple);
      countRMultiple++;
    }

    // Holding duration
    if (trade.exitDate && trade.entryDate) {
      const startMs = trade.entryDate.getTime();
      const endMs = trade.exitDate.getTime();
      if (endMs >= startMs) {
        totalHoldingSeconds += Math.floor((endMs - startMs) / 1000);
        holdingTradesCount++;
      }
    }
  }

  // Total risk includes all trades where riskAmount was defined
  let totalRisk = ZERO_DECIMAL;
  for (const trade of trades) {
    if (trade.riskAmount && trade.riskAmount.greaterThan(0)) {
      totalRisk = totalRisk.plus(trade.riskAmount);
    }
  }

  const totalCosts = totalCommission.plus(totalFees).plus(totalSwap);

  const winRate = closedTradesCount > 0 ? roundRate((winningCount / closedTradesCount) * 100) : 0;
  const lossRate = closedTradesCount > 0 ? roundRate((losingCount / closedTradesCount) * 100) : 0;

  const averageTradePnl =
    closedTradesCount > 0
      ? totalNetPnl.dividedBy(closedTradesCount).toFixed(2)
      : ZERO_STR;

  const averageWinner =
    winningCount > 0
      ? sumWinningNetPnl.dividedBy(winningCount).toFixed(2)
      : ZERO_STR;

  const averageLoser =
    losingCount > 0
      ? sumLosingNetPnl.dividedBy(losingCount).toFixed(2)
      : ZERO_STR;

  let profitFactor: DecimalString | null = null;
  if (grossLoss.greaterThan(0)) {
    profitFactor = grossProfit.dividedBy(grossLoss).toFixed(2);
  } else if (grossProfit.greaterThan(0)) {
    profitFactor = null; // Unbounded (positive profit with 0 loss)
  }

  const expectancy =
    closedTradesCount > 0
      ? totalNetPnl.dividedBy(closedTradesCount).toFixed(2)
      : ZERO_STR;

  const averageR =
    countRMultiple > 0
      ? sumRMultiple.dividedBy(countRMultiple).toFixed(2)
      : null;

  const averageWinningR =
    countWinningR > 0
      ? sumWinningR.dividedBy(countWinningR).toFixed(2)
      : null;

  const averageLosingR =
    countLosingR > 0
      ? sumLosingR.dividedBy(countLosingR).toFixed(2)
      : null;

  const longWinRate = longCount > 0 ? roundRate((longWins / longCount) * 100) : 0;
  const shortWinRate = shortCount > 0 ? roundRate((shortWins / shortCount) * 100) : 0;

  const averageHoldingDurationSeconds =
    holdingTradesCount > 0 ? Math.floor(totalHoldingSeconds / holdingTradesCount) : 0;

  // 3. Chronologically sorted closed trades for streaks and drawdown
  const sortedClosedTrades = [...closedTradesList].sort((a, b) => {
    const timeA = (a.exitDate ?? a.entryDate).getTime();
    const timeB = (b.exitDate ?? b.entryDate).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  // Streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  for (const trade of sortedClosedTrades) {
    const netPnl = trade.netPnl ?? ZERO_DECIMAL;
    if (netPnl.greaterThan(0)) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else if (netPnl.lessThan(0)) {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  }

  // Current streak at tail
  let currentStreak: { count: number; type: "WIN" | "LOSS" | "BREAKEVEN" | "NONE" } = {
    count: 0,
    type: "NONE",
  };

  if (sortedClosedTrades.length > 0) {
    const lastTrade = sortedClosedTrades[sortedClosedTrades.length - 1];
    const lastPnl = lastTrade.netPnl ?? ZERO_DECIMAL;

    if (lastPnl.greaterThan(0)) {
      let count = 0;
      for (let i = sortedClosedTrades.length - 1; i >= 0; i--) {
        if ((sortedClosedTrades[i].netPnl ?? ZERO_DECIMAL).greaterThan(0)) count++;
        else break;
      }
      currentStreak = { count, type: "WIN" };
    } else if (lastPnl.lessThan(0)) {
      let count = 0;
      for (let i = sortedClosedTrades.length - 1; i >= 0; i--) {
        if ((sortedClosedTrades[i].netPnl ?? ZERO_DECIMAL).lessThan(0)) count++;
        else break;
      }
      currentStreak = { count, type: "LOSS" };
    } else {
      let count = 0;
      for (let i = sortedClosedTrades.length - 1; i >= 0; i--) {
        if ((sortedClosedTrades[i].netPnl ?? ZERO_DECIMAL).equals(0)) count++;
        else break;
      }
      currentStreak = { count, type: "BREAKEVEN" };
    }
  }

  // Equity Curve & Max Drawdown
  const equityCurve: EquityCurvePointDto[] = [];
  let cumulativePnl = ZERO_DECIMAL;
  let peakCumPnl = ZERO_DECIMAL;
  let peakEquity = accountInitialBalance ? new Prisma.Decimal(accountInitialBalance) : null;
  let maxDrawdown = ZERO_DECIMAL;
  let maxDrawdownPercentage: number | null = null;

  for (const trade of sortedClosedTrades) {
    const netPnl = trade.netPnl ?? ZERO_DECIMAL;
    cumulativePnl = cumulativePnl.plus(netPnl);

    if (cumulativePnl.greaterThan(peakCumPnl)) {
      peakCumPnl = cumulativePnl;
    }

    const dd = peakCumPnl.minus(cumulativePnl);
    if (dd.greaterThan(maxDrawdown)) {
      maxDrawdown = dd;
    }

    let currentEquityStr: string | null = null;

    if (accountInitialBalance !== null) {
      const currentEquity = accountInitialBalance.plus(cumulativePnl);
      if (peakEquity === null || currentEquity.greaterThan(peakEquity)) {
        peakEquity = currentEquity;
      }

      currentEquityStr = currentEquity.toFixed(2);

      if (peakEquity && peakEquity.greaterThan(0)) {
        const ddFromPeak = peakEquity.minus(currentEquity);
        const ddPct = ddFromPeak.dividedBy(peakEquity).times(100).toNumber();
        if (maxDrawdownPercentage === null || ddPct > maxDrawdownPercentage) {
          maxDrawdownPercentage = roundRate(ddPct);
        }
      }
    }

    equityCurve.push({
      tradeId: trade.id,
      exitDate: (trade.exitDate ?? trade.entryDate).toISOString(),
      netPnl: netPnl.toFixed(2),
      cumulativePnl: cumulativePnl.toFixed(2),
      equity: currentEquityStr,
      drawdown: dd.toFixed(2),
    });
  }

  const endingEquity =
    accountInitialBalance !== null
      ? accountInitialBalance.plus(cumulativePnl).toFixed(2)
      : null;

  const peakEquityStr = peakEquity !== null ? peakEquity.toFixed(2) : null;

  // 4. Grouped Breakdown Computations

  // Group by Date
  const dateMap = new Map<
    string,
    { count: number; wins: number; losses: number; netPnl: Prisma.Decimal }
  >();
  for (const trade of closedTradesList) {
    const dStr = formatDateUtc(trade.exitDate ?? trade.entryDate);
    const item = dateMap.get(dStr) ?? {
      count: 0,
      wins: 0,
      losses: 0,
      netPnl: ZERO_DECIMAL,
    };
    item.count++;
    const netPnl = trade.netPnl ?? ZERO_DECIMAL;
    item.netPnl = item.netPnl.plus(netPnl);
    if (netPnl.greaterThan(0)) item.wins++;
    else if (netPnl.lessThan(0)) item.losses++;
    dateMap.set(dStr, item);
  }

  const byDate: PerformanceByDateItemDto[] = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      tradeCount: data.count,
      winCount: data.wins,
      lossCount: data.losses,
      netPnl: data.netPnl.toFixed(2),
      winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
    }));

  // Group by Symbol
  const symbolMap = new Map<
    string,
    {
      count: number;
      wins: number;
      losses: number;
      netPnl: Prisma.Decimal;
      grossProfit: Prisma.Decimal;
      grossLoss: Prisma.Decimal;
    }
  >();
  for (const trade of closedTradesList) {
    const sym = trade.title?.trim() || "Unspecified";
    const item = symbolMap.get(sym) ?? {
      count: 0,
      wins: 0,
      losses: 0,
      netPnl: ZERO_DECIMAL,
      grossProfit: ZERO_DECIMAL,
      grossLoss: ZERO_DECIMAL,
    };
    item.count++;
    const netPnl = trade.netPnl ?? ZERO_DECIMAL;
    const grossPnl = trade.grossPnl ?? netPnl;
    item.netPnl = item.netPnl.plus(netPnl);
    if (netPnl.greaterThan(0)) {
      item.wins++;
      item.grossProfit = item.grossProfit.plus(grossPnl.greaterThan(0) ? grossPnl : netPnl);
    } else if (netPnl.lessThan(0)) {
      item.losses++;
      item.grossLoss = item.grossLoss.plus(grossPnl.lessThan(0) ? grossPnl.abs() : netPnl.abs());
    }
    symbolMap.set(sym, item);
  }

  const bySymbol: PerformanceBySymbolItemDto[] = Array.from(symbolMap.entries())
    .map(([symbol, data]) => {
      let pf: DecimalString | null = null;
      if (data.grossLoss.greaterThan(0)) {
        pf = data.grossProfit.dividedBy(data.grossLoss).toFixed(2);
      }
      return {
        symbol,
        tradeCount: data.count,
        winCount: data.wins,
        lossCount: data.losses,
        netPnl: data.netPnl.toFixed(2),
        winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
        profitFactor: pf,
      };
    })
    .sort((a, b) => b.tradeCount - a.tradeCount);

  // Group by Strategy
  const strategyMap = new Map<
    string,
    {
      strategyId: string | null;
      strategyName: string;
      count: number;
      wins: number;
      losses: number;
      netPnl: Prisma.Decimal;
    }
  >();
  for (const trade of closedTradesList) {
    const key = trade.strategyId ?? "__none__";
    const item = strategyMap.get(key) ?? {
      strategyId: trade.strategyId,
      strategyName: trade.strategy?.name ?? "No Strategy",
      count: 0,
      wins: 0,
      losses: 0,
      netPnl: ZERO_DECIMAL,
    };
    item.count++;
    const netPnl = trade.netPnl ?? ZERO_DECIMAL;
    item.netPnl = item.netPnl.plus(netPnl);
    if (netPnl.greaterThan(0)) item.wins++;
    else if (netPnl.lessThan(0)) item.losses++;
    strategyMap.set(key, item);
  }

  const byStrategy: PerformanceByStrategyItemDto[] = Array.from(strategyMap.values())
    .map((data) => ({
      strategyId: data.strategyId,
      strategyName: data.strategyName,
      tradeCount: data.count,
      winCount: data.wins,
      lossCount: data.losses,
      netPnl: data.netPnl.toFixed(2),
      winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  // Group by Setup
  const setupMap = new Map<
    string,
    {
      setupId: string | null;
      setupName: string;
      count: number;
      wins: number;
      losses: number;
      netPnl: Prisma.Decimal;
    }
  >();
  for (const trade of closedTradesList) {
    const key = trade.setupId ?? "__none__";
    const item = setupMap.get(key) ?? {
      setupId: trade.setupId,
      setupName: trade.setup?.name ?? "No Setup",
      count: 0,
      wins: 0,
      losses: 0,
      netPnl: ZERO_DECIMAL,
    };
    item.count++;
    const netPnl = trade.netPnl ?? ZERO_DECIMAL;
    item.netPnl = item.netPnl.plus(netPnl);
    if (netPnl.greaterThan(0)) item.wins++;
    else if (netPnl.lessThan(0)) item.losses++;
    setupMap.set(key, item);
  }

  const bySetup: PerformanceBySetupItemDto[] = Array.from(setupMap.values())
    .map((data) => ({
      setupId: data.setupId,
      setupName: data.setupName,
      tradeCount: data.count,
      winCount: data.wins,
      lossCount: data.losses,
      netPnl: data.netPnl.toFixed(2),
      winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  // Group by Tag
  const tagMap = new Map<
    string,
    {
      tagId: string;
      tagName: string;
      tagColor: string | null;
      count: number;
      wins: number;
      losses: number;
      netPnl: Prisma.Decimal;
    }
  >();
  for (const trade of closedTradesList) {
    for (const assoc of trade.tags) {
      const t = assoc.tag;
      const item = tagMap.get(t.id) ?? {
        tagId: t.id,
        tagName: t.name,
        tagColor: t.color,
        count: 0,
        wins: 0,
        losses: 0,
        netPnl: ZERO_DECIMAL,
      };
      item.count++;
      const netPnl = trade.netPnl ?? ZERO_DECIMAL;
      item.netPnl = item.netPnl.plus(netPnl);
      if (netPnl.greaterThan(0)) item.wins++;
      else if (netPnl.lessThan(0)) item.losses++;
      tagMap.set(t.id, item);
    }
  }

  const byTag: PerformanceByTagItemDto[] = Array.from(tagMap.values())
    .map((data) => ({
      tagId: data.tagId,
      tagName: data.tagName,
      tagColor: data.tagColor,
      tradeCount: data.count,
      winCount: data.wins,
      lossCount: data.losses,
      netPnl: data.netPnl.toFixed(2),
      winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  // Group by Mistake
  const mistakeMap = new Map<
    string,
    {
      mistakeId: string;
      mistakeName: string;
      count: number;
      netPnl: Prisma.Decimal;
      totalLoss: Prisma.Decimal;
    }
  >();
  for (const trade of closedTradesList) {
    for (const assoc of trade.mistakes) {
      const m = assoc.mistake;
      const item = mistakeMap.get(m.id) ?? {
        mistakeId: m.id,
        mistakeName: m.name,
        count: 0,
        netPnl: ZERO_DECIMAL,
        totalLoss: ZERO_DECIMAL,
      };
      item.count++;
      const netPnl = trade.netPnl ?? ZERO_DECIMAL;
      item.netPnl = item.netPnl.plus(netPnl);
      if (netPnl.lessThan(0)) {
        item.totalLoss = item.totalLoss.plus(netPnl.abs());
      }
      mistakeMap.set(m.id, item);
    }
  }

  const byMistake: PerformanceByMistakeItemDto[] = Array.from(mistakeMap.values())
    .map((data) => ({
      mistakeId: data.mistakeId,
      mistakeName: data.mistakeName,
      tradeCount: data.count,
      netPnl: data.netPnl.toFixed(2),
      totalLoss: data.totalLoss.toFixed(2),
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  // Group by Account
  const accountMap = new Map<
    string,
    {
      tradingAccountId: string;
      accountName: string;
      currency: string;
      count: number;
      wins: number;
      netPnl: Prisma.Decimal;
    }
  >();
  for (const trade of closedTradesList) {
    const acc = trade.tradingAccount;
    const item = accountMap.get(acc.id) ?? {
      tradingAccountId: acc.id,
      accountName: acc.name,
      currency: acc.currency,
      count: 0,
      wins: 0,
      netPnl: ZERO_DECIMAL,
    };
    item.count++;
    const netPnl = trade.netPnl ?? ZERO_DECIMAL;
    item.netPnl = item.netPnl.plus(netPnl);
    if (netPnl.greaterThan(0)) item.wins++;
    accountMap.set(acc.id, item);
  }

  const byAccount: PerformanceByAccountItemDto[] = Array.from(accountMap.values())
    .map((data) => ({
      tradingAccountId: data.tradingAccountId,
      accountName: data.accountName,
      currency: data.currency,
      tradeCount: data.count,
      netPnl: data.netPnl.toFixed(2),
      winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  const metrics: CorePerformanceMetricsDto = {
    totalTrades,
    closedTrades: closedTradesCount,
    openTrades: openTradesCount,
    winningTrades: winningCount,
    losingTrades: losingCount,
    breakevenTrades: breakevenCount,
    winRate,
    lossRate,
    grossProfit: grossProfit.toFixed(2),
    grossLoss: grossLoss.toFixed(2),
    netPnl: totalNetPnl.toFixed(2),
    totalCommission: totalCommission.toFixed(2),
    totalFees: totalFees.toFixed(2),
    totalSwap: totalSwap.toFixed(2),
    totalCosts: totalCosts.toFixed(2),
    averageTradePnl,
    averageWinner,
    averageLoser,
    largestWinner: largestWinner ? largestWinner.toFixed(2) : ZERO_STR,
    largestLoser: largestLoser ? largestLoser.toFixed(2) : ZERO_STR,
    profitFactor,
    expectancy,
    totalRisk: totalRisk.toFixed(2),
    averageR,
    averageWinningR,
    averageLosingR,
    maxDrawdown: maxDrawdown.toFixed(2),
    maxDrawdownPercentage,
    peakEquity: peakEquityStr,
    endingEquity,
    winningStreak: maxWinStreak,
    losingStreak: maxLossStreak,
    currentStreak,
    averageHoldingDurationSeconds,
    totalHoldingDurationSeconds: totalHoldingSeconds,
    longTradeCount: longCount,
    shortTradeCount: shortCount,
    longNetPnl: longNetPnl.toFixed(2),
    shortNetPnl: shortNetPnl.toFixed(2),
    longWinRate,
    shortWinRate,
  };

  return {
    metrics,
    byDate,
    bySymbol,
    byStrategy,
    bySetup,
    byTag,
    byMistake,
    byAccount,
    equityCurve,
  };
}
