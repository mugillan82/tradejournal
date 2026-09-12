/**
 * Calendar Domain — Public Types
 *
 * Strongly typed DTOs and contracts for the Trading Calendar & Performance views.
 *
 * All financial amounts are serialized as DecimalString to preserve precision.
 */

import type { TradeSideValue, TradeStatusValue, DecimalString } from "../trade/types";

export type { DecimalString };

/**
 * Filter contract for calendar queries.
 */
export interface CalendarFilterInput {
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
 * Trade summary item rendered in calendar day details.
 */
export interface CalendarTradeItemDto {
  readonly id: string;
  readonly title: string | null;
  readonly side: TradeSideValue;
  readonly status: TradeStatusValue;
  readonly entryDate: string;
  readonly exitDate: string | null;
  readonly entryPrice: DecimalString;
  readonly exitPrice: DecimalString | null;
  readonly quantity: DecimalString;
  readonly grossPnl: DecimalString | null;
  readonly netPnl: DecimalString | null;
  readonly actualRMultiple: DecimalString | null;
  readonly riskAmount: DecimalString | null;
  readonly tradingAccount: {
    readonly id: string;
    readonly name: string;
    readonly currency: string;
  };
  readonly strategy: {
    readonly id: string;
    readonly name: string;
  } | null;
  readonly setup: {
    readonly id: string;
    readonly name: string;
  } | null;
  readonly tags: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly color: string | null;
  }>;
  readonly mistakes: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
}

/**
 * Daily aggregation item for a specific calendar date.
 */
export interface CalendarDayDto {
  readonly date: string; // YYYY-MM-DD
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly breakevenCount: number;
  readonly openCount: number;
  readonly netPnl: DecimalString;
  readonly winRate: number;
  readonly totalR: DecimalString | null;
  readonly hasJournalEntry: boolean;
  readonly journalEntryId: string | null;
  readonly journalMood: string | null;
  readonly journalNotes: string | null;
  readonly trades: ReadonlyArray<CalendarTradeItemDto>;
}

/**
 * Summary metrics for the requested month.
 */
export interface CalendarMonthSummaryDto {
  readonly month: string; // YYYY-MM
  readonly totalTrades: number;
  readonly closedTrades: number;
  readonly openTrades: number;
  readonly winningTrades: number;
  readonly losingTrades: number;
  readonly breakevenTrades: number;
  readonly netPnl: DecimalString;
  readonly grossProfit: DecimalString;
  readonly grossLoss: DecimalString;
  readonly winRate: number;
  readonly profitFactor: DecimalString | null;
  readonly winningDays: number;
  readonly losingDays: number;
  readonly breakevenDays: number;
  readonly bestDay: {
    readonly date: string;
    readonly netPnl: DecimalString;
  } | null;
  readonly worstDay: {
    readonly date: string;
    readonly netPnl: DecimalString;
  } | null;
  readonly averageDailyPnl: DecimalString;
  readonly totalRisk: DecimalString;
  readonly averageR: DecimalString | null;
}

/**
 * Complete response DTO for month calendar queries.
 */
export interface MonthCalendarDto {
  readonly month: string; // YYYY-MM
  readonly summary: CalendarMonthSummaryDto;
  readonly days: Record<string, CalendarDayDto>;
}
