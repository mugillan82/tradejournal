/**
 * Dashboard Domain — Public Types
 *
 * Strongly typed DTOs and contracts for the Premium Trading Dashboard V2.
 * Financial metrics use DecimalString for lossless JSON serialization.
 */

import type { DecimalString, TradeDto } from "../trade/types";
import type { TradingAccountDto } from "../account/types";
import type { JournalEntryDto } from "../journal/types";
import type { MonthCalendarDto } from "../calendar/types";
import type {
  CorePerformanceMetricsDto,
  EquityCurvePointDto,
  PerformanceBySymbolItemDto,
  PerformanceByStrategyItemDto,
} from "../analytics/types";

export type { DecimalString, TradeDto, TradingAccountDto, JournalEntryDto, MonthCalendarDto };

/**
 * Filter parameters supported by the Dashboard.
 */
export interface DashboardFilterInput {
  readonly tradingAccountId?: string;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
}

/**
 * High-level summary of performance today.
 */
export interface DashboardTodaySummaryDto {
  readonly netPnl: DecimalString;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly winRate: number;
}

/**
 * High-level summary of performance in the current calendar month.
 */
export interface DashboardMonthSummaryDto {
  readonly monthStr: string; // YYYY-MM
  readonly netPnl: DecimalString;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly winRate: number;
}

/**
 * Long vs Short directional performance summary.
 */
export interface DashboardDirectionSummaryDto {
  readonly long: {
    readonly tradeCount: number;
    readonly winRate: number;
    readonly netPnl: DecimalString;
  };
  readonly short: {
    readonly tradeCount: number;
    readonly winRate: number;
    readonly netPnl: DecimalString;
  };
}

/**
 * Consolidated authenticated Dashboard Overview DTO.
 */
export interface DashboardOverviewDto {
  readonly performance: CorePerformanceMetricsDto;
  readonly equityCurve: ReadonlyArray<EquityCurvePointDto>;
  readonly today: DashboardTodaySummaryDto;
  readonly currentMonth: DashboardMonthSummaryDto;
  readonly recentTrades: ReadonlyArray<TradeDto>;
  readonly topSymbols: ReadonlyArray<PerformanceBySymbolItemDto>;
  readonly topStrategies: ReadonlyArray<PerformanceByStrategyItemDto>;
  readonly direction: DashboardDirectionSummaryDto;
  readonly accounts: ReadonlyArray<TradingAccountDto>;
  readonly recentJournalEntries: ReadonlyArray<JournalEntryDto>;
  readonly calendar: MonthCalendarDto;
}
