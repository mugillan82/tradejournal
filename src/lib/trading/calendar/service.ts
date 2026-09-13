/**
 * Calendar Domain — Service
 *
 * Production-grade server-only service for Trading Calendar and daily performance views.
 * Connects individual trade activity, realized P&L, and journal entries.
 * Enforces server-side authentication, per-user isolation, and Decimal precision.
 */

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireServerUserId } from "@/lib/auth/session";
import type {
  MonthCalendarDto,
  CalendarDayDto,
  CalendarMonthSummaryDto,
  CalendarTradeItemDto,
  CalendarFilterInput,
} from "./types";

const ZERO_DECIMAL = new Prisma.Decimal(0);

/**
 * Format a Date into UTC YYYY-MM-DD string.
 */
function formatDateUtc(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Round a percentage rate to 2 decimal places.
 */
function roundRate(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Validate and normalize a YYYY-MM month parameter.
 * Falls back to current UTC month if invalid.
 */
export function normalizeMonthParam(monthParam?: string | null): string {
  if (monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) {
    return monthParam;
  }
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Compute the UTC date range for a given YYYY-MM month string.
 */
export function getMonthDateRange(monthStr: string): { startOfMonth: Date; endOfMonth: Date } {
  const [yearStr, monthNumStr] = monthStr.split("-");
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthNumStr, 10) - 1;

  const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  // Day 0 of next month is the last day of the current month
  const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  return { startOfMonth, endOfMonth };
}

/**
 * Get monthly calendar performance and daily trades.
 */
export async function getMonthCalendar(
  monthParam?: string | null,
  filters: CalendarFilterInput = {},
): Promise<MonthCalendarDto> {
  const userId = await requireServerUserId();
  const normalizedMonth = normalizeMonthParam(monthParam);
  const { startOfMonth, endOfMonth } = getMonthDateRange(normalizedMonth);

  // Build Prisma where clause for trades
  const tradeWhere: Prisma.TradeWhereInput = {
    userId,
    OR: [
      // Closed trades whose exitDate falls in this month
      {
        status: "CLOSED",
        exitDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      // Closed trades without exitDate whose entryDate falls in this month
      {
        status: "CLOSED",
        exitDate: null,
        entryDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      // Open or cancelled trades whose entryDate falls in this month
      {
        status: { in: ["OPEN", "CANCELLED"] },
        entryDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    ],
  };

  // Dimensional filters
  if (filters.tradingAccountId) {
    tradeWhere.tradingAccountId = filters.tradingAccountId;
  }
  if (filters.symbol && filters.symbol.trim().length > 0) {
    tradeWhere.title = { contains: filters.symbol.trim(), mode: "insensitive" };
  }
  if (filters.side) {
    tradeWhere.side = filters.side;
  }
  if (filters.status) {
    tradeWhere.status = filters.status;
  }
  if (filters.strategyId) {
    tradeWhere.strategyId = filters.strategyId;
  }
  if (filters.setupId) {
    tradeWhere.setupId = filters.setupId;
  }
  if (filters.tagId) {
    tradeWhere.tags = { some: { tagId: filters.tagId } };
  }
  if (filters.mistakeId) {
    tradeWhere.mistakes = { some: { mistakeId: filters.mistakeId } };
  }

  // Fetch trades, journal entries, and reviews in parallel
  const [tradeRecords, journalRecords, reviewRecords] = await Promise.all([
    prisma.trade.findMany({
      where: tradeWhere,
      include: {
        tradingAccount: {
          select: {
            id: true,
            name: true,
            currency: true,
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
      orderBy: [{ exitDate: "asc" }, { entryDate: "asc" }, { id: "asc" }],
    }),
    prisma.journalEntry.findMany({
      where: {
        userId,
        entryDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { entryDate: "asc" },
    }),
    prisma.review.findMany({
      where: {
        userId,
        reviewDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: { id: true, reviewDate: true },
      orderBy: { reviewDate: "asc" },
    }),
  ]);

  // Build journal lookup map by YYYY-MM-DD
  const journalMap = new Map<
    string,
    { id: string; mood: string | null; notes: string | null }
  >();
  for (const entry of journalRecords) {
    const dStr = formatDateUtc(entry.entryDate);
    journalMap.set(dStr, {
      id: entry.id,
      mood: entry.mood,
      notes: entry.notes,
    });
  }

  // Build reviews lookup map by YYYY-MM-DD
  const reviewMap = new Map<string, string[]>();
  for (const r of reviewRecords) {
    const dStr = formatDateUtc(r.reviewDate);
    const existing = reviewMap.get(dStr) || [];
    existing.push(r.id);
    reviewMap.set(dStr, existing);
  }

  // Group trades by date and compute day & month metrics
  const dayMap = new Map<
    string,
    {
      tradeCount: number;
      winCount: number;
      lossCount: number;
      breakevenCount: number;
      openCount: number;
      netPnl: Prisma.Decimal;
      totalR: Prisma.Decimal | null;
      trades: CalendarTradeItemDto[];
    }
  >();

  // Monthly accumulators
  let totalTrades = 0;
  let closedTrades = 0;
  let openTrades = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;
  let netPnl = ZERO_DECIMAL;
  let grossProfit = ZERO_DECIMAL;
  let grossLoss = ZERO_DECIMAL;
  let totalRisk = ZERO_DECIMAL;
  let sumRMultiple = ZERO_DECIMAL;
  let countRMultiple = 0;

  for (const trade of tradeRecords) {
    totalTrades++;
    const isClosed = trade.status === "CLOSED";
    const tradeDate = isClosed ? trade.exitDate ?? trade.entryDate : trade.entryDate;
    const dateStr = formatDateUtc(tradeDate);

    // Initialize day entry if not present
    let dayData = dayMap.get(dateStr);
    if (!dayData) {
      dayData = {
        tradeCount: 0,
        winCount: 0,
        lossCount: 0,
        breakevenCount: 0,
        openCount: 0,
        netPnl: ZERO_DECIMAL,
        totalR: null,
        trades: [],
      };
      dayMap.set(dateStr, dayData);
    }

    dayData.tradeCount++;

    const tradeNetPnl = trade.netPnl ?? ZERO_DECIMAL;
    const tradeGrossPnl = trade.grossPnl ?? tradeNetPnl;

    if (trade.riskAmount) {
      totalRisk = totalRisk.plus(trade.riskAmount);
    }

    if (trade.actualRMultiple !== null) {
      sumRMultiple = sumRMultiple.plus(trade.actualRMultiple);
      countRMultiple++;

      dayData.totalR = (dayData.totalR ?? ZERO_DECIMAL).plus(trade.actualRMultiple);
    }

    if (isClosed) {
      closedTrades++;
      netPnl = netPnl.plus(tradeNetPnl);
      dayData.netPnl = dayData.netPnl.plus(tradeNetPnl);

      if (tradeNetPnl.greaterThan(0)) {
        winningTrades++;
        dayData.winCount++;
        grossProfit = grossProfit.plus(tradeGrossPnl.greaterThan(0) ? tradeGrossPnl : tradeNetPnl);
      } else if (tradeNetPnl.lessThan(0)) {
        losingTrades++;
        dayData.lossCount++;
        grossLoss = grossLoss.plus(tradeGrossPnl.lessThan(0) ? tradeGrossPnl.abs() : tradeNetPnl.abs());
      } else {
        breakevenTrades++;
        dayData.breakevenCount++;
      }
    } else {
      openTrades++;
      dayData.openCount++;
    }

    const tradeDto: CalendarTradeItemDto = {
      id: trade.id,
      title: trade.title,
      side: trade.side,
      status: trade.status,
      entryDate: trade.entryDate.toISOString(),
      exitDate: trade.exitDate ? trade.exitDate.toISOString() : null,
      entryPrice: trade.entryPrice.toFixed(8),
      exitPrice: trade.exitPrice ? trade.exitPrice.toFixed(8) : null,
      quantity: trade.quantity.toFixed(8),
      grossPnl: trade.grossPnl ? trade.grossPnl.toFixed(2) : null,
      netPnl: trade.netPnl ? trade.netPnl.toFixed(2) : null,
      actualRMultiple: trade.actualRMultiple ? trade.actualRMultiple.toFixed(2) : null,
      riskAmount: trade.riskAmount ? trade.riskAmount.toFixed(2) : null,
      tradingAccount: {
        id: trade.tradingAccount.id,
        name: trade.tradingAccount.name,
        currency: trade.tradingAccount.currency,
      },
      strategy: trade.strategy ? { id: trade.strategy.id, name: trade.strategy.name } : null,
      setup: trade.setup ? { id: trade.setup.id, name: trade.setup.name } : null,
      tags: trade.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
      })),
      mistakes: trade.mistakes.map((m) => ({
        id: m.mistake.id,
        name: m.mistake.name,
      })),
    };

    dayData.trades.push(tradeDto);
  }

  // Also include days that have journal entries or reviews even if they have no trades
  for (const [dateStr] of journalMap.entries()) {
    if (!dayMap.has(dateStr)) {
      dayMap.set(dateStr, {
        tradeCount: 0,
        winCount: 0,
        lossCount: 0,
        breakevenCount: 0,
        openCount: 0,
        netPnl: ZERO_DECIMAL,
        totalR: null,
        trades: [],
      });
    }
  }

  for (const [dateStr] of reviewMap.entries()) {
    if (!dayMap.has(dateStr)) {
      dayMap.set(dateStr, {
        tradeCount: 0,
        winCount: 0,
        lossCount: 0,
        breakevenCount: 0,
        openCount: 0,
        netPnl: ZERO_DECIMAL,
        totalR: null,
        trades: [],
      });
    }
  }

  // Assemble days map
  const days: Record<string, CalendarDayDto> = {};
  let winningDays = 0;
  let losingDays = 0;
  let breakevenDays = 0;
  let bestDay: { date: string; netPnl: Prisma.Decimal } | null = null;
  let worstDay: { date: string; netPnl: Prisma.Decimal } | null = null;

  for (const [dateStr, data] of dayMap.entries()) {
    const journalInfo = journalMap.get(dateStr);
    const reviewIds = reviewMap.get(dateStr) || [];
    const winRate = data.tradeCount > 0 ? roundRate((data.winCount / data.tradeCount) * 100) : 0;

    // Daily winning/losing day stats (only count days with trades)
    if (data.tradeCount > 0) {
      if (data.netPnl.greaterThan(0)) {
        winningDays++;
        if (bestDay === null || data.netPnl.greaterThan(bestDay.netPnl)) {
          bestDay = { date: dateStr, netPnl: data.netPnl };
        }
      } else if (data.netPnl.lessThan(0)) {
        losingDays++;
        if (worstDay === null || data.netPnl.lessThan(worstDay.netPnl)) {
          worstDay = { date: dateStr, netPnl: data.netPnl };
        }
      } else {
        breakevenDays++;
      }
    }

    const dayDto: CalendarDayDto = {
      date: dateStr,
      tradeCount: data.tradeCount,
      winCount: data.winCount,
      lossCount: data.lossCount,
      breakevenCount: data.breakevenCount,
      openCount: data.openCount,
      netPnl: data.netPnl.toFixed(2),
      winRate,
      totalR: data.totalR !== null ? data.totalR.toFixed(2) : null,
      hasJournalEntry: Boolean(journalInfo),
      journalEntryId: journalInfo ? journalInfo.id : null,
      journalMood: journalInfo ? journalInfo.mood : null,
      journalNotes: journalInfo ? journalInfo.notes : null,
      hasReview: reviewIds.length > 0,
      reviewCount: reviewIds.length,
      reviewIds,
      trades: data.trades,
    };

    days[dateStr] = dayDto;
  }

  // Summary computations
  const winRate = closedTrades > 0 ? roundRate((winningTrades / closedTrades) * 100) : 0;
  const profitFactor =
    grossLoss.greaterThan(0)
      ? grossProfit.dividedBy(grossLoss).toFixed(2)
      : grossProfit.greaterThan(0)
        ? null
        : null;

  const tradingDaysCount = winningDays + losingDays + breakevenDays;
  const averageDailyPnl =
    tradingDaysCount > 0
      ? netPnl.dividedBy(tradingDaysCount).toFixed(2)
      : "0.00";

  const averageR =
    countRMultiple > 0
      ? sumRMultiple.dividedBy(countRMultiple).toFixed(2)
      : null;

  const summary: CalendarMonthSummaryDto = {
    month: normalizedMonth,
    totalTrades,
    closedTrades,
    openTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    netPnl: netPnl.toFixed(2),
    grossProfit: grossProfit.toFixed(2),
    grossLoss: grossLoss.toFixed(2),
    winRate,
    profitFactor,
    winningDays,
    losingDays,
    breakevenDays,
    bestDay: bestDay ? { date: bestDay.date, netPnl: bestDay.netPnl.toFixed(2) } : null,
    worstDay: worstDay ? { date: worstDay.date, netPnl: worstDay.netPnl.toFixed(2) } : null,
    averageDailyPnl,
    totalRisk: totalRisk.toFixed(2),
    averageR,
  };

  return {
    month: normalizedMonth,
    summary,
    days,
  };
}
