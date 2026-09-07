/**
 * Trade Domain — Public Types
 *
 * Strongly typed DTOs and contracts used by the Trade service.
 * These types are the contract that the rest of the application
 * (UI, API routes, server actions, imports, analytics) will rely on.
 *
 * IMPORTANT:
 * - All financial inputs/outputs are represented as STRINGS
 *   to preserve Decimal precision when crossing the wire.
 * - Domain invariants (positive quantities, valid prices,
 *   consistent closed/open state, etc.) are enforced by
 *   `validation.ts` — not by these types.
 */

import type { TradeSide, TradeStatus } from "@prisma/client";

/**
 * String-encoded decimal for financial values.
 *
 * Prisma's `Decimal` type does not serialize cleanly across
 * JSON. We use a string alias so callers always handle the
 * conversion to/from Prisma's Decimal explicitly.
 */
export type DecimalString = string;

/**
 * Coerces an unknown value into a DecimalString.
 * Throws if the value cannot be safely represented.
 *
 * Intended for trusted, validated input only — not user input.
 */
export function toDecimalString(value: unknown): DecimalString {
  if (typeof value !== "string") {
    throw new TypeError("Decimal value must be a string");
  }
  if (!/^-?\d+(\.\d+)?$/.test(value)) {
    throw new TypeError(`Invalid decimal value: ${value}`);
  }
  return value;
}

/**
 * Trade Side re-exported for application code that should not
 * depend directly on @prisma/client.
 */
export type { TradeSide, TradeStatus };

export type TradeSideValue = "LONG" | "SHORT";
export type TradeStatusValue = "OPEN" | "CLOSED" | "CANCELLED";

/**
 * Sort field options for listTrades.
 * Aligned with the existing schema indexes for performance.
 */
export type TradeSortField =
  | "entryDate"
  | "exitDate"
  | "createdAt"
  | "updatedAt"
  | "netPnl"
  | "grossPnl"
  | "quantity";

export type SortDirection = "asc" | "desc";

/**
 * Filterable facets for listTrades.
 * All filters are optional; an empty filter object returns the
 * user's full trade list (subject to pagination).
 */
export interface TradeListFilters {
  /** Filter by one or more trade IDs. */
  readonly ids?: ReadonlyArray<string>;
  /** Restrict to a specific trading account. */
  readonly tradingAccountId?: string;
  /** Filter by side (LONG / SHORT). */
  readonly side?: TradeSideValue;
  /** Filter by status (OPEN / CLOSED / CANCELLED). */
  readonly status?: TradeStatusValue | ReadonlyArray<TradeStatusValue>;
  /** Inclusive lower bound on entryDate. */
  readonly entryDateFrom?: Date;
  /** Exclusive upper bound on entryDate. */
  readonly entryDateTo?: Date;
  /** Inclusive lower bound on exitDate (only matched for closed trades). */
  readonly exitDateFrom?: Date;
  /** Exclusive upper bound on exitDate. */
  readonly exitDateTo?: Date;
  /**
   * Free-text search over the trade title and notes.
   * Uses Prisma's `contains` with case-insensitive matching.
   */
  readonly search?: string;
}

export interface TradeListSort {
  readonly field: TradeSortField;
  readonly direction: SortDirection;
}

export interface TradeListPagination {
  /** 1-based page index. */
  readonly page: number;
  /** Page size (1..200). */
  readonly pageSize: number;
}

/**
 * Public Trade DTO returned to application code.
 *
 * Prisma Decimal fields are exposed as DecimalString to avoid
 * floating point coercion. Convert at the edge if needed.
 */
export interface TradeDto {
  readonly id: string;
  readonly userId: string;
  readonly tradingAccountId: string;
  readonly side: TradeSideValue;
  readonly status: TradeStatusValue;
  readonly entryPrice: DecimalString;
  readonly entryDate: Date;
  readonly exitPrice: DecimalString | null;
  readonly exitDate: Date | null;
  readonly stopLoss: DecimalString | null;
  readonly takeProfit: DecimalString | null;
  readonly riskAmount: DecimalString | null;
  readonly plannedRiskReward: DecimalString | null;
  readonly actualRMultiple: DecimalString | null;
  readonly quantity: DecimalString;
  readonly grossPnl: DecimalString | null;
  readonly commission: DecimalString | null;
  readonly fees: DecimalString | null;
  readonly swap: DecimalString | null;
  readonly netPnl: DecimalString | null;
  readonly title: string | null;
  readonly notes: string | null;
  readonly strategyId: string | null;
  readonly setupId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input DTO for creating a Trade.
 *
 * The service obtains `userId` from the authenticated session —
 * never from the client payload.
 */
export interface CreateTradeInput {
  readonly tradingAccountId: string;
  readonly side: TradeSideValue;
  readonly entryPrice: DecimalString;
  readonly entryDate: Date;
  readonly exitPrice?: DecimalString | null;
  readonly exitDate?: Date | null;
  readonly stopLoss?: DecimalString | null;
  readonly takeProfit?: DecimalString | null;
  readonly riskAmount?: DecimalString | null;
  readonly plannedRiskReward?: DecimalString | null;
  readonly quantity: DecimalString;
  readonly commission?: DecimalString | null;
  readonly fees?: DecimalString | null;
  readonly swap?: DecimalString | null;
  readonly grossPnl?: DecimalString | null;
  readonly netPnl?: DecimalString | null;
  readonly status?: TradeStatusValue;
  readonly title?: string | null;
  readonly notes?: string | null;
  readonly strategyId?: string | null;
  readonly setupId?: string | null;
}

/**
 * Input DTO for updating a Trade.
 *
 * All fields are optional. The service:
 * - Re-validates the merged shape.
 * - Enforces consistency between `status` and exit fields.
 * - Computes `netPnl` / `actualRMultiple` if those are not supplied
 *   and the trade is being closed.
 */
export interface UpdateTradeInput {
  readonly side?: TradeSideValue;
  readonly entryPrice?: DecimalString;
  readonly entryDate?: Date;
  readonly exitPrice?: DecimalString | null;
  readonly exitDate?: Date | null;
  readonly stopLoss?: DecimalString | null;
  readonly takeProfit?: DecimalString | null;
  readonly riskAmount?: DecimalString | null;
  readonly plannedRiskReward?: DecimalString | null;
  readonly quantity?: DecimalString;
  readonly commission?: DecimalString | null;
  readonly fees?: DecimalString | null;
  readonly swap?: DecimalString | null;
  readonly grossPnl?: DecimalString | null;
  readonly netPnl?: DecimalString | null;
  readonly status?: TradeStatusValue;
  readonly title?: string | null;
  readonly notes?: string | null;
  readonly strategyId?: string | null;
  readonly setupId?: string | null;
}

/**
 * Result wrapper for listTrades.
 * Includes enough metadata for table pagination components.
 */
export interface TradeListResult {
  readonly items: ReadonlyArray<TradeDto>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
