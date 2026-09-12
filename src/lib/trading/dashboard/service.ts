/**
 * Dashboard Domain — Service Layer
 *
 * Server-only composition service for the Premium Trading Dashboard V2.
 *
 * Guarantees:
 * - Server-only execution (`import "server-only"`).
 * - Per-user isolation on all underlying database operations.
 * - Single source of truth: delegates financial math strictly to the Analytics Engine & Calendar Engine.
 * - High performance: executes independent queries in parallel without N+1 requests.
 */

import "server-only";

import { requireServerUserId } from "@/lib/auth/session";
import { getAnalyticsOverview } from "../analytics/service";
import { getMonthCalendar, normalizeMonthParam } from "../calendar/service";
import { listTrades } from "../trade/service";
import { listTradingAccounts } from "../account/service";
import { listJournalEntries } from "../journal/service";

import type {
  DashboardFilterInput,
  DashboardOverviewDto,
  DashboardTodaySummaryDto,
  DashboardMonthSummaryDto,
  DashboardDirectionSummaryDto,
} from "./types";
import { validateDashboardFilterInput } from "./validation";
import {
  createAuthRequiredError,
  createDatabaseError,
  createValidationError,
} from "./errors";

/**
 * Format a Date to UTC YYYY-MM-DD.
 */
function formatDateUtc(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Fetch consolidated dashboard overview for authenticated user.
 */
export async function getDashboardOverview(
  rawFilters?: unknown,
  sessionUserId?: string,
): Promise<DashboardOverviewDto> {
  let userId: string;
  if (sessionUserId) {
    userId = sessionUserId;
  } else {
    try {
      userId = await requireServerUserId();
    } catch {
      throw createAuthRequiredError();
    }
  }

  const valResult = validateDashboardFilterInput(rawFilters);
  if (!valResult.isValid) {
    throw createValidationError("Invalid dashboard filter parameters.", valResult.errors);
  }
  const filters: DashboardFilterInput = valResult.sanitizedInput ?? {};

  const currentMonthStr = normalizeMonthParam();
  const todayUtcStr = formatDateUtc(new Date());

  try {
    // Parallel execution of all required sub-domain queries
    const [
      analyticsData,
      calendarData,
      recentTradesResult,
      accountsResult,
      journalResult,
    ] = await Promise.all([
      getAnalyticsOverview(
        {
          tradingAccountId: filters.tradingAccountId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        },
        userId,
      ),
      getMonthCalendar(currentMonthStr, {
        tradingAccountId: filters.tradingAccountId,
      }),
      listTrades({
        pagination: { page: 1, pageSize: 6 },
        sort: { field: "entryDate", direction: "desc" },
        filters: {
          tradingAccountId: filters.tradingAccountId,
          entryDateFrom: filters.dateFrom,
          entryDateTo: filters.dateTo,
        },
      }),
      listTradingAccounts({
        pagination: { page: 1, pageSize: 20 },
      }),
      listJournalEntries({}, { page: 1, pageSize: 4 }),
    ]);

    // Compute Today metrics from calendar day data if available
    const todayDay = calendarData.days[todayUtcStr];
    const today: DashboardTodaySummaryDto = todayDay
      ? {
          netPnl: todayDay.netPnl,
          tradeCount: todayDay.tradeCount,
          winCount: todayDay.winCount,
          lossCount: todayDay.lossCount,
          winRate: todayDay.winRate,
        }
      : {
          netPnl: "0.00",
          tradeCount: 0,
          winCount: 0,
          lossCount: 0,
          winRate: 0,
        };

    // Compute Current Month summary
    const currentMonth: DashboardMonthSummaryDto = {
      monthStr: calendarData.month,
      netPnl: calendarData.summary.netPnl,
      tradeCount: calendarData.summary.totalTrades,
      winCount: calendarData.summary.winningTrades,
      lossCount: calendarData.summary.losingTrades,
      winRate: calendarData.summary.winRate,
    };

    // Top 5 Symbols by trade count
    const topSymbols = [...analyticsData.bySymbol]
      .sort((a, b) => b.tradeCount - a.tradeCount)
      .slice(0, 5);

    // Top 5 Strategies by trade count
    const topStrategies = [...analyticsData.byStrategy]
      .sort((a, b) => b.tradeCount - a.tradeCount)
      .slice(0, 5);

    // Directional summary from analytics metrics
    const direction: DashboardDirectionSummaryDto = {
      long: {
        tradeCount: analyticsData.metrics.longTradeCount,
        winRate: analyticsData.metrics.longWinRate,
        netPnl: analyticsData.metrics.longNetPnl,
      },
      short: {
        tradeCount: analyticsData.metrics.shortTradeCount,
        winRate: analyticsData.metrics.shortWinRate,
        netPnl: analyticsData.metrics.shortNetPnl,
      },
    };

    return {
      performance: analyticsData.metrics,
      equityCurve: analyticsData.equityCurve,
      today,
      currentMonth,
      recentTrades: recentTradesResult.items,
      topSymbols,
      topStrategies,
      direction,
      accounts: accountsResult.items,
      recentJournalEntries: journalResult.items,
      calendar: calendarData,
    };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "name" in err) {
      const errName = (err as { name: string }).name;
      if (errName === "DashboardServiceError" || errName === "AnalyticsServiceError") {
        throw err;
      }
    }
    throw createDatabaseError();
  }
}
