/**
 * Analytics Domain — Public Types
 *
 * Strongly typed DTOs and contracts used by the Analytics and Performance engine.
 *
 * IMPORTANT:
 * - All financial inputs/outputs are represented as string-encoded decimals (DecimalString)
 *   to preserve Decimal precision across JSON serialization.
 * - Dates are ISO formatted or standard Date objects.
 */

import type { TradeSideValue, TradeStatusValue, DecimalString } from "../trade/types";

export type { DecimalString };

/**
 * Filter contract for analytics overview and reports.
 * Used to filter trades across multiple dimensions.
 */
export interface AnalyticsFilterInput {
  /** Inclusive lower bound on trade entryDate */
  readonly dateFrom?: Date;
  /** Exclusive or inclusive upper bound on trade entryDate */
  readonly dateTo?: Date;
  /** Filter to a single trading account */
  readonly tradingAccountId?: string;
  /** Filter by trade symbol / title */
  readonly symbol?: string;
  /** Filter by side: LONG or SHORT */
  readonly side?: TradeSideValue;
  /** Filter by trade status: OPEN, CLOSED, CANCELLED */
  readonly status?: TradeStatusValue;
  /** Filter by strategy */
  readonly strategyId?: string;
  /** Filter by setup */
  readonly setupId?: string;
  /** Filter by tag */
  readonly tagId?: string;
  /** Filter by mistake */
  readonly mistakeId?: string;
}

/**
 * Core performance metrics summary.
 */
export interface CorePerformanceMetricsDto {
  /** Total trades matching the filter (open + closed + cancelled) */
  readonly totalTrades: number;
  /** Total closed trades evaluated for realized performance */
  readonly closedTrades: number;
  /** Total open trades currently active */
  readonly openTrades: number;
  /** Total winning trades (closed with netPnl > 0) */
  readonly winningTrades: number;
  /** Total losing trades (closed with netPnl < 0) */
  readonly losingTrades: number;
  /** Total breakeven trades (closed with netPnl == 0) */
  readonly breakevenTrades: number;
  /** Win rate percentage (0 - 100), e.g. 62.50 */
  readonly winRate: number;
  /** Loss rate percentage (0 - 100), e.g. 37.50 */
  readonly lossRate: number;
  /** Gross profit (sum of winning gross P&L) */
  readonly grossProfit: DecimalString;
  /** Gross loss (sum of absolute losing gross P&L, positive magnitude) */
  readonly grossLoss: DecimalString;
  /** Net realized P&L after commissions, fees, and swap */
  readonly netPnl: DecimalString;
  /** Total broker commissions */
  readonly totalCommission: DecimalString;
  /** Total exchange/regulatory fees */
  readonly totalFees: DecimalString;
  /** Total swap / financing costs */
  readonly totalSwap: DecimalString;
  /** Total costs (commission + fees + swap) */
  readonly totalCosts: DecimalString;
  /** Average P&L across all closed trades */
  readonly averageTradePnl: DecimalString;
  /** Average P&L across winning trades */
  readonly averageWinner: DecimalString;
  /** Average P&L across losing trades (negative value) */
  readonly averageLoser: DecimalString;
  /** Largest single winning trade net P&L */
  readonly largestWinner: DecimalString;
  /** Largest single losing trade net P&L (most negative value) */
  readonly largestLoser: DecimalString;
  /** Profit factor (grossProfit / grossLoss), or null if grossLoss is 0 */
  readonly profitFactor: DecimalString | null;
  /** Expectancy (average dollar return per closed trade) */
  readonly expectancy: DecimalString;
  /** Total capital risked across trades where riskAmount was specified */
  readonly totalRisk: DecimalString;
  /** Average realized R-multiple across trades where actualRMultiple is present */
  readonly averageR: DecimalString | null;
  /** Average R-multiple for winning trades */
  readonly averageWinningR: DecimalString | null;
  /** Average R-multiple for losing trades */
  readonly averageLosingR: DecimalString | null;
  /** Maximum peak-to-trough drawdown in dollar terms */
  readonly maxDrawdown: DecimalString;
  /** Maximum drawdown percentage if initial account balance is established */
  readonly maxDrawdownPercentage: number | null;
  /** Peak equity reached (initial balance + cumulative P&L peak, or null if no balance) */
  readonly peakEquity: DecimalString | null;
  /** Ending equity (initial balance + cumulative net P&L, or null if no balance) */
  readonly endingEquity: DecimalString | null;
  /** Maximum consecutive winning trades */
  readonly winningStreak: number;
  /** Maximum consecutive losing trades */
  readonly losingStreak: number;
  /** Current streak status of the most recent trades */
  readonly currentStreak: {
    readonly count: number;
    readonly type: "WIN" | "LOSS" | "BREAKEVEN" | "NONE";
  };
  /** Average trade holding duration in seconds */
  readonly averageHoldingDurationSeconds: number;
  /** Total holding duration of all closed trades in seconds */
  readonly totalHoldingDurationSeconds: number;
  /** Count of LONG closed trades */
  readonly longTradeCount: number;
  /** Count of SHORT closed trades */
  readonly shortTradeCount: number;
  /** Net P&L from LONG trades */
  readonly longNetPnl: DecimalString;
  /** Net P&L from SHORT trades */
  readonly shortNetPnl: DecimalString;
  /** Win rate for LONG trades (0 - 100) */
  readonly longWinRate: number;
  /** Win rate for SHORT trades (0 - 100) */
  readonly shortWinRate: number;
}

/**
 * Breakdown by Date (UTC Calendar Day).
 */
export interface PerformanceByDateItemDto {
  readonly date: string; // YYYY-MM-DD
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
}

/**
 * Breakdown by Symbol / Instrument.
 */
export interface PerformanceBySymbolItemDto {
  readonly symbol: string;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
  readonly profitFactor: DecimalString | null;
}

/**
 * Breakdown by Strategy.
 */
export interface PerformanceByStrategyItemDto {
  readonly strategyId: string | null;
  readonly strategyName: string;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
}

/**
 * Breakdown by Setup.
 */
export interface PerformanceBySetupItemDto {
  readonly setupId: string | null;
  readonly setupName: string;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
}

/**
 * Breakdown by Tag.
 */
export interface PerformanceByTagItemDto {
  readonly tagId: string;
  readonly tagName: string;
  readonly tagColor: string | null;
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
}

/**
 * Breakdown by Mistake.
 */
export interface PerformanceByMistakeItemDto {
  readonly mistakeId: string;
  readonly mistakeName: string;
  readonly tradeCount: number;
  readonly netPnl: DecimalString;
  readonly totalLoss: DecimalString;
}

/**
 * Breakdown by Trading Account.
 */
export interface PerformanceByAccountItemDto {
  readonly tradingAccountId: string;
  readonly accountName: string;
  readonly currency: string;
  readonly tradeCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
}

/**
 * Equity curve point representing trade-by-trade cumulative progression.
 */
export interface EquityCurvePointDto {
  readonly tradeId: string;
  readonly exitDate: string; // ISO string
  readonly netPnl: DecimalString;
  readonly cumulativePnl: DecimalString;
  readonly equity: DecimalString | null;
  readonly drawdown: DecimalString;
}

/**
 * Top-level Analytics Overview DTO.
 */
export interface AnalyticsOverviewDto {
  readonly metrics: CorePerformanceMetricsDto;
  readonly byDate: ReadonlyArray<PerformanceByDateItemDto>;
  readonly bySymbol: ReadonlyArray<PerformanceBySymbolItemDto>;
  readonly byStrategy: ReadonlyArray<PerformanceByStrategyItemDto>;
  readonly bySetup: ReadonlyArray<PerformanceBySetupItemDto>;
  readonly byTag: ReadonlyArray<PerformanceByTagItemDto>;
  readonly byMistake: ReadonlyArray<PerformanceByMistakeItemDto>;
  readonly byAccount: ReadonlyArray<PerformanceByAccountItemDto>;
  readonly equityCurve: ReadonlyArray<EquityCurvePointDto>;
}
