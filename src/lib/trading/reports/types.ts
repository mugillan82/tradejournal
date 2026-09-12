/**
 * Reports Domain — Public Types
 *
 * Strongly typed DTOs and contracts for the Advanced Reporting Engine.
 * All financial metrics use DecimalString for lossless JSON serialization.
 */

import type { DecimalString } from "../trade/types";
import type { CorePerformanceMetricsDto, EquityCurvePointDto, AnalyticsFilterInput } from "../analytics/types";

export type { DecimalString, CorePerformanceMetricsDto, EquityCurvePointDto };

export type ReportFilterInput = AnalyticsFilterInput;

/**
 * Symbol report row item.
 */
export interface SymbolReportItemDto {
  readonly symbol: string;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
  readonly averageTradePnl: DecimalString;
  readonly grossProfit: DecimalString;
  readonly grossLoss: DecimalString;
  readonly profitFactor: DecimalString | null;
  readonly averageR: DecimalString | null;
}

/**
 * Strategy report row item.
 */
export interface StrategyReportItemDto {
  readonly strategyId: string | null;
  readonly strategyName: string;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
  readonly averageTradePnl: DecimalString;
  readonly expectancy: DecimalString;
  readonly averageR: DecimalString | null;
}

/**
 * Setup report row item.
 */
export interface SetupReportItemDto {
  readonly setupId: string | null;
  readonly setupName: string;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
  readonly averageTradePnl: DecimalString;
  readonly expectancy: DecimalString;
  readonly averageR: DecimalString | null;
}

/**
 * Tag report row item.
 */
export interface TagReportItemDto {
  readonly tagId: string;
  readonly tagName: string;
  readonly tagColor: string | null;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
  readonly averageTradePnl: DecimalString;
  readonly averageR: DecimalString | null;
}

/**
 * Mistake report row item.
 */
export interface MistakeReportItemDto {
  readonly mistakeId: string;
  readonly mistakeName: string;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly totalLoss: DecimalString;
  readonly averageLoss: DecimalString;
  readonly winRate: number;
}

/**
 * Trading Account report row item.
 */
export interface AccountReportItemDto {
  readonly tradingAccountId: string;
  readonly accountName: string;
  readonly currency: string;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
  readonly averageTradePnl: DecimalString;
}

/**
 * Directional stats summary for Long vs Short.
 */
export interface DirectionStatsDto {
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
  readonly averageTradePnl: DecimalString;
  readonly grossProfit: DecimalString;
  readonly grossLoss: DecimalString;
  readonly averageR: DecimalString | null;
}

export interface DirectionReportDto {
  readonly long: DirectionStatsDto;
  readonly short: DirectionStatsDto;
}

/**
 * Daily and monthly time-based aggregations.
 */
export interface TimeReportDailyItemDto {
  readonly date: string; // YYYY-MM-DD
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
  readonly averageTradePnl: DecimalString;
}

export interface TimeReportMonthlyItemDto {
  readonly month: string; // YYYY-MM
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
  readonly averageTradePnl: DecimalString;
}

export interface TimeReportDto {
  readonly daily: ReadonlyArray<TimeReportDailyItemDto>;
  readonly monthly: ReadonlyArray<TimeReportMonthlyItemDto>;
}

/**
 * Full Report Overview DTO returned by the Reports Engine.
 */
export interface ReportOverviewDto {
  readonly performance: CorePerformanceMetricsDto;
  readonly equityCurve: ReadonlyArray<EquityCurvePointDto>;
  readonly symbols: ReadonlyArray<SymbolReportItemDto>;
  readonly strategies: ReadonlyArray<StrategyReportItemDto>;
  readonly setups: ReadonlyArray<SetupReportItemDto>;
  readonly tags: ReadonlyArray<TagReportItemDto>;
  readonly mistakes: ReadonlyArray<MistakeReportItemDto>;
  readonly accounts: ReadonlyArray<AccountReportItemDto>;
  readonly direction: DirectionReportDto;
  readonly time: TimeReportDto;
}
