/**
 * Reports Domain — Service & Reporting Engine
 *
 * Production-grade server-only service for Advanced Trading Reports.
 * Reuses canonical financial calculations from the Analytics Engine.
 * Enforces server-side authentication, per-user data isolation, and Decimal precision.
 */

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireServerUserId } from "@/lib/auth/session";
import { computeAnalytics } from "../analytics/service";
import type {
  ReportOverviewDto,
  ReportFilterInput,
  SymbolReportItemDto,
  StrategyReportItemDto,
  SetupReportItemDto,
  TagReportItemDto,
  MistakeReportItemDto,
  AccountReportItemDto,
  DirectionReportDto,
  TimeReportDto,
  TimeReportDailyItemDto,
  TimeReportMonthlyItemDto,
} from "./types";
import {
  createAuthRequiredError,
  createValidationError,
  createDatabaseError,
} from "./errors";
import { validateReportFilterInput } from "./validation";

const ZERO_DECIMAL = new Prisma.Decimal(0);

function roundRate(val: number): number {
  return Math.round(val * 100) / 100;
}

function formatDateUtc(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthUtc(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function getReportOverview(
  rawFilters: unknown = {},
  providedUserId?: string,
): Promise<ReportOverviewDto> {
  let userId = providedUserId;
  if (!userId) {
    try {
      userId = await requireServerUserId();
    } catch {
      throw createAuthRequiredError();
    }
  }

  const validation = validateReportFilterInput(rawFilters);
  if (!validation.isValid || !validation.sanitizedFilter) {
    throw createValidationError(validation.errors);
  }
  const filters: ReportFilterInput = validation.sanitizedFilter;

  try {
    // Build Prisma query filter
    const where: Prisma.TradeWhereInput = {
      userId,
    };

    if (filters.dateFrom || filters.dateTo) {
      where.entryDate = {};
      if (filters.dateFrom) where.entryDate.gte = filters.dateFrom;
      if (filters.dateTo) where.entryDate.lte = filters.dateTo;
    }

    if (filters.tradingAccountId) {
      where.tradingAccountId = filters.tradingAccountId;
    }

    if (filters.symbol && filters.symbol.trim().length > 0) {
      where.title = { contains: filters.symbol.trim(), mode: "insensitive" };
    }

    if (filters.side) {
      where.side = filters.side;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.strategyId) {
      where.strategyId = filters.strategyId;
    }

    if (filters.setupId) {
      where.setupId = filters.setupId;
    }

    if (filters.tagId) {
      where.tags = { some: { tagId: filters.tagId } };
    }

    if (filters.mistakeId) {
      where.mistakes = { some: { mistakeId: filters.mistakeId } };
    }

    // Fetch matching trades
    const trades = await prisma.trade.findMany({
      where,
      include: {
        tradingAccount: {
          select: {
            id: true,
            name: true,
            currency: true,
            initialBalance: true,
          },
        },
        strategy: {
          select: {
            id: true,
            name: true,
          },
        },
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

    // Reuse canonical Analytics computation
    const analytics = computeAnalytics(trades, singleAccountInitialBalance);

    // Compute detailed report breakdown tables from closed trades
    const closedTrades = trades.filter((t) => t.status === "CLOSED");

    // 1. Symbol Report Table
    const symbolMap = new Map<
      string,
      {
        count: number;
        wins: number;
        losses: number;
        netPnl: Prisma.Decimal;
        grossProfit: Prisma.Decimal;
        grossLoss: Prisma.Decimal;
        sumR: Prisma.Decimal;
        countR: number;
      }
    >();

    for (const trade of closedTrades) {
      const sym = trade.title?.trim() || "Unspecified";
      const item = symbolMap.get(sym) ?? {
        count: 0,
        wins: 0,
        losses: 0,
        netPnl: ZERO_DECIMAL,
        grossProfit: ZERO_DECIMAL,
        grossLoss: ZERO_DECIMAL,
        sumR: ZERO_DECIMAL,
        countR: 0,
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

      if (trade.actualRMultiple !== null) {
        item.sumR = item.sumR.plus(trade.actualRMultiple);
        item.countR++;
      }

      symbolMap.set(sym, item);
    }

    const symbols: SymbolReportItemDto[] = Array.from(symbolMap.entries())
      .sort(([, a], [, b]) => b.netPnl.minus(a.netPnl).toNumber())
      .map(([symbol, data]) => ({
        symbol,
        tradeCount: data.count,
        winCount: data.wins,
        lossCount: data.losses,
        netPnl: data.netPnl.toFixed(2),
        winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
        averageTradePnl: data.count > 0 ? data.netPnl.dividedBy(data.count).toFixed(2) : "0.00",
        grossProfit: data.grossProfit.toFixed(2),
        grossLoss: data.grossLoss.toFixed(2),
        profitFactor:
          data.grossLoss.greaterThan(0)
            ? data.grossProfit.dividedBy(data.grossLoss).toFixed(2)
            : data.grossProfit.greaterThan(0)
              ? null
              : null,
        averageR: data.countR > 0 ? data.sumR.dividedBy(data.countR).toFixed(2) : null,
      }));

    // 2. Strategy Report Table
    const strategyMap = new Map<
      string,
      {
        id: string | null;
        name: string;
        count: number;
        wins: number;
        losses: number;
        netPnl: Prisma.Decimal;
        sumR: Prisma.Decimal;
        countR: number;
      }
    >();

    for (const trade of closedTrades) {
      const sKey = trade.strategyId || "unassigned";
      const sName = trade.strategy?.name || "No Strategy";
      const item = strategyMap.get(sKey) ?? {
        id: trade.strategyId,
        name: sName,
        count: 0,
        wins: 0,
        losses: 0,
        netPnl: ZERO_DECIMAL,
        sumR: ZERO_DECIMAL,
        countR: 0,
      };
      item.count++;
      const netPnl = trade.netPnl ?? ZERO_DECIMAL;
      item.netPnl = item.netPnl.plus(netPnl);
      if (netPnl.greaterThan(0)) item.wins++;
      else if (netPnl.lessThan(0)) item.losses++;

      if (trade.actualRMultiple !== null) {
        item.sumR = item.sumR.plus(trade.actualRMultiple);
        item.countR++;
      }

      strategyMap.set(sKey, item);
    }

    const strategies: StrategyReportItemDto[] = Array.from(strategyMap.values())
      .sort((a, b) => b.netPnl.minus(a.netPnl).toNumber())
      .map((data) => ({
        strategyId: data.id,
        strategyName: data.name,
        tradeCount: data.count,
        winCount: data.wins,
        lossCount: data.losses,
        netPnl: data.netPnl.toFixed(2),
        winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
        averageTradePnl: data.count > 0 ? data.netPnl.dividedBy(data.count).toFixed(2) : "0.00",
        expectancy: data.count > 0 ? data.netPnl.dividedBy(data.count).toFixed(2) : "0.00",
        averageR: data.countR > 0 ? data.sumR.dividedBy(data.countR).toFixed(2) : null,
      }));

    // 3. Setup Report Table
    const setupMap = new Map<
      string,
      {
        id: string | null;
        name: string;
        count: number;
        wins: number;
        losses: number;
        netPnl: Prisma.Decimal;
        sumR: Prisma.Decimal;
        countR: number;
      }
    >();

    for (const trade of closedTrades) {
      const sKey = trade.setupId || "unassigned";
      const sName = trade.setup?.name || "No Setup";
      const item = setupMap.get(sKey) ?? {
        id: trade.setupId,
        name: sName,
        count: 0,
        wins: 0,
        losses: 0,
        netPnl: ZERO_DECIMAL,
        sumR: ZERO_DECIMAL,
        countR: 0,
      };
      item.count++;
      const netPnl = trade.netPnl ?? ZERO_DECIMAL;
      item.netPnl = item.netPnl.plus(netPnl);
      if (netPnl.greaterThan(0)) item.wins++;
      else if (netPnl.lessThan(0)) item.losses++;

      if (trade.actualRMultiple !== null) {
        item.sumR = item.sumR.plus(trade.actualRMultiple);
        item.countR++;
      }

      setupMap.set(sKey, item);
    }

    const setups: SetupReportItemDto[] = Array.from(setupMap.values())
      .sort((a, b) => b.netPnl.minus(a.netPnl).toNumber())
      .map((data) => ({
        setupId: data.id,
        setupName: data.name,
        tradeCount: data.count,
        winCount: data.wins,
        lossCount: data.losses,
        netPnl: data.netPnl.toFixed(2),
        winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
        averageTradePnl: data.count > 0 ? data.netPnl.dividedBy(data.count).toFixed(2) : "0.00",
        expectancy: data.count > 0 ? data.netPnl.dividedBy(data.count).toFixed(2) : "0.00",
        averageR: data.countR > 0 ? data.sumR.dividedBy(data.countR).toFixed(2) : null,
      }));

    // 4. Tag Report Table
    const tagMap = new Map<
      string,
      {
        id: string;
        name: string;
        color: string | null;
        count: number;
        wins: number;
        losses: number;
        netPnl: Prisma.Decimal;
        sumR: Prisma.Decimal;
        countR: number;
      }
    >();

    for (const trade of closedTrades) {
      for (const t of trade.tags) {
        const item = tagMap.get(t.tag.id) ?? {
          id: t.tag.id,
          name: t.tag.name,
          color: t.tag.color,
          count: 0,
          wins: 0,
          losses: 0,
          netPnl: ZERO_DECIMAL,
          sumR: ZERO_DECIMAL,
          countR: 0,
        };
        item.count++;
        const netPnl = trade.netPnl ?? ZERO_DECIMAL;
        item.netPnl = item.netPnl.plus(netPnl);
        if (netPnl.greaterThan(0)) item.wins++;
        else if (netPnl.lessThan(0)) item.losses++;

        if (trade.actualRMultiple !== null) {
          item.sumR = item.sumR.plus(trade.actualRMultiple);
          item.countR++;
        }

        tagMap.set(t.tag.id, item);
      }
    }

    const tags: TagReportItemDto[] = Array.from(tagMap.values())
      .sort((a, b) => b.netPnl.minus(a.netPnl).toNumber())
      .map((data) => ({
        tagId: data.id,
        tagName: data.name,
        tagColor: data.color,
        tradeCount: data.count,
        winCount: data.wins,
        lossCount: data.losses,
        netPnl: data.netPnl.toFixed(2),
        winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
        averageTradePnl: data.count > 0 ? data.netPnl.dividedBy(data.count).toFixed(2) : "0.00",
        averageR: data.countR > 0 ? data.sumR.dividedBy(data.countR).toFixed(2) : null,
      }));

    // 5. Mistake Report Table
    const mistakeMap = new Map<
      string,
      {
        id: string;
        name: string;
        count: number;
        wins: number;
        losses: number;
        netPnl: Prisma.Decimal;
        totalLoss: Prisma.Decimal;
      }
    >();

    for (const trade of closedTrades) {
      for (const m of trade.mistakes) {
        const item = mistakeMap.get(m.mistake.id) ?? {
          id: m.mistake.id,
          name: m.mistake.name,
          count: 0,
          wins: 0,
          losses: 0,
          netPnl: ZERO_DECIMAL,
          totalLoss: ZERO_DECIMAL,
        };
        item.count++;
        const netPnl = trade.netPnl ?? ZERO_DECIMAL;
        item.netPnl = item.netPnl.plus(netPnl);
        if (netPnl.greaterThan(0)) {
          item.wins++;
        } else if (netPnl.lessThan(0)) {
          item.losses++;
          item.totalLoss = item.totalLoss.plus(netPnl.abs());
        }
        mistakeMap.set(m.mistake.id, item);
      }
    }

    const mistakes: MistakeReportItemDto[] = Array.from(mistakeMap.values())
      .sort((a, b) => b.totalLoss.minus(a.totalLoss).toNumber())
      .map((data) => ({
        mistakeId: data.id,
        mistakeName: data.name,
        tradeCount: data.count,
        winCount: data.wins,
        lossCount: data.losses,
        netPnl: data.netPnl.toFixed(2),
        totalLoss: data.totalLoss.toFixed(2),
        averageLoss: data.losses > 0 ? data.totalLoss.dividedBy(data.losses).toFixed(2) : "0.00",
        winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
      }));

    // 6. Account Report Table
    const accountMap = new Map<
      string,
      {
        id: string;
        name: string;
        currency: string;
        count: number;
        wins: number;
        losses: number;
        netPnl: Prisma.Decimal;
      }
    >();

    for (const trade of closedTrades) {
      const acc = trade.tradingAccount;
      const item = accountMap.get(acc.id) ?? {
        id: acc.id,
        name: acc.name,
        currency: acc.currency,
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

      accountMap.set(acc.id, item);
    }

    const accounts: AccountReportItemDto[] = Array.from(accountMap.values())
      .sort((a, b) => b.netPnl.minus(a.netPnl).toNumber())
      .map((data) => ({
        tradingAccountId: data.id,
        accountName: data.name,
        currency: data.currency,
        tradeCount: data.count,
        winCount: data.wins,
        lossCount: data.losses,
        netPnl: data.netPnl.toFixed(2),
        winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
        averageTradePnl: data.count > 0 ? data.netPnl.dividedBy(data.count).toFixed(2) : "0.00",
      }));

    // 7. Direction Report (Long vs Short)
    let longCount = 0;
    let longWins = 0;
    let longLosses = 0;
    let longNetPnl = ZERO_DECIMAL;
    let longGrossProfit = ZERO_DECIMAL;
    let longGrossLoss = ZERO_DECIMAL;
    let longSumR = ZERO_DECIMAL;
    let longCountR = 0;

    let shortCount = 0;
    let shortWins = 0;
    let shortLosses = 0;
    let shortNetPnl = ZERO_DECIMAL;
    let shortGrossProfit = ZERO_DECIMAL;
    let shortGrossLoss = ZERO_DECIMAL;
    let shortSumR = ZERO_DECIMAL;
    let shortCountR = 0;

    for (const trade of closedTrades) {
      const netPnl = trade.netPnl ?? ZERO_DECIMAL;
      const grossPnl = trade.grossPnl ?? netPnl;

      if (trade.side === "LONG") {
        longCount++;
        longNetPnl = longNetPnl.plus(netPnl);
        if (netPnl.greaterThan(0)) {
          longWins++;
          longGrossProfit = longGrossProfit.plus(grossPnl.greaterThan(0) ? grossPnl : netPnl);
        } else if (netPnl.lessThan(0)) {
          longLosses++;
          longGrossLoss = longGrossLoss.plus(grossPnl.lessThan(0) ? grossPnl.abs() : netPnl.abs());
        }
        if (trade.actualRMultiple !== null) {
          longSumR = longSumR.plus(trade.actualRMultiple);
          longCountR++;
        }
      } else if (trade.side === "SHORT") {
        shortCount++;
        shortNetPnl = shortNetPnl.plus(netPnl);
        if (netPnl.greaterThan(0)) {
          shortWins++;
          shortGrossProfit = shortGrossProfit.plus(grossPnl.greaterThan(0) ? grossPnl : netPnl);
        } else if (netPnl.lessThan(0)) {
          shortLosses++;
          shortGrossLoss = shortGrossLoss.plus(grossPnl.lessThan(0) ? grossPnl.abs() : netPnl.abs());
        }
        if (trade.actualRMultiple !== null) {
          shortSumR = shortSumR.plus(trade.actualRMultiple);
          shortCountR++;
        }
      }
    }

    const direction: DirectionReportDto = {
      long: {
        tradeCount: longCount,
        winCount: longWins,
        lossCount: longLosses,
        netPnl: longNetPnl.toFixed(2),
        winRate: longCount > 0 ? roundRate((longWins / longCount) * 100) : 0,
        averageTradePnl: longCount > 0 ? longNetPnl.dividedBy(longCount).toFixed(2) : "0.00",
        grossProfit: longGrossProfit.toFixed(2),
        grossLoss: longGrossLoss.toFixed(2),
        averageR: longCountR > 0 ? longSumR.dividedBy(longCountR).toFixed(2) : null,
      },
      short: {
        tradeCount: shortCount,
        winCount: shortWins,
        lossCount: shortLosses,
        netPnl: shortNetPnl.toFixed(2),
        winRate: shortCount > 0 ? roundRate((shortWins / shortCount) * 100) : 0,
        averageTradePnl: shortCount > 0 ? shortNetPnl.dividedBy(shortCount).toFixed(2) : "0.00",
        grossProfit: shortGrossProfit.toFixed(2),
        grossLoss: shortGrossLoss.toFixed(2),
        averageR: shortCountR > 0 ? shortSumR.dividedBy(shortCountR).toFixed(2) : null,
      },
    };

    // 8. Time Report (Daily & Monthly)
    const dailyMap = new Map<
      string,
      { count: number; wins: number; losses: number; netPnl: Prisma.Decimal }
    >();

    const monthlyMap = new Map<
      string,
      { count: number; wins: number; losses: number; netPnl: Prisma.Decimal }
    >();

    for (const trade of closedTrades) {
      const d = trade.exitDate ?? trade.entryDate;
      const dateStr = formatDateUtc(d);
      const monthStr = formatMonthUtc(d);
      const netPnl = trade.netPnl ?? ZERO_DECIMAL;

      // Daily
      const dItem = dailyMap.get(dateStr) ?? {
        count: 0,
        wins: 0,
        losses: 0,
        netPnl: ZERO_DECIMAL,
      };
      dItem.count++;
      dItem.netPnl = dItem.netPnl.plus(netPnl);
      if (netPnl.greaterThan(0)) dItem.wins++;
      else if (netPnl.lessThan(0)) dItem.losses++;
      dailyMap.set(dateStr, dItem);

      // Monthly
      const mItem = monthlyMap.get(monthStr) ?? {
        count: 0,
        wins: 0,
        losses: 0,
        netPnl: ZERO_DECIMAL,
      };
      mItem.count++;
      mItem.netPnl = mItem.netPnl.plus(netPnl);
      if (netPnl.greaterThan(0)) mItem.wins++;
      else if (netPnl.lessThan(0)) mItem.losses++;
      monthlyMap.set(monthStr, mItem);
    }

    const timeDaily: TimeReportDailyItemDto[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // descending
      .map(([date, data]) => ({
        date,
        tradeCount: data.count,
        winCount: data.wins,
        lossCount: data.losses,
        netPnl: data.netPnl.toFixed(2),
        winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
        averageTradePnl: data.count > 0 ? data.netPnl.dividedBy(data.count).toFixed(2) : "0.00",
      }));

    const timeMonthly: TimeReportMonthlyItemDto[] = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // descending
      .map(([month, data]) => ({
        month,
        tradeCount: data.count,
        winCount: data.wins,
        lossCount: data.losses,
        netPnl: data.netPnl.toFixed(2),
        winRate: data.count > 0 ? roundRate((data.wins / data.count) * 100) : 0,
        averageTradePnl: data.count > 0 ? data.netPnl.dividedBy(data.count).toFixed(2) : "0.00",
      }));

    const time: TimeReportDto = {
      daily: timeDaily,
      monthly: timeMonthly,
    };

    return {
      performance: analytics.metrics,
      equityCurve: analytics.equityCurve,
      symbols,
      strategies,
      setups,
      tags,
      mistakes,
      accounts,
      direction,
      time,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "ReportServiceError") {
      throw err;
    }
    throw createDatabaseError(err);
  }
}
