/**
 * Trading Account Domain — Public Types
 *
 * Strongly typed DTOs and contracts used by the Trading Account service.
 * Follows the project's established domain architecture.
 *
 * All financial values are represented as DecimalString to preserve
 * exact Decimal precision across wire and service boundaries.
 */

export type DecimalString = string;

/**
 * Common account types supported by the domain.
 */
export type TradingAccountTypeValue =
  | "SIMULATION"
  | "PAPER_TRADING"
  | "LIVE"
  | "DEMO";

export type TradingAccountSortField =
  | "name"
  | "createdAt"
  | "updatedAt"
  | "initialBalance"
  | "currentBalance";

export type SortDirection = "asc" | "desc";

export interface TradingAccountListFilters {
  /** Filter by one or more account IDs. */
  readonly ids?: ReadonlyArray<string>;
  /** Filter by active state. */
  readonly isActive?: boolean;
  /** Filter by 3-character ISO currency code. */
  readonly currency?: string;
  /** Filter by account type. */
  readonly type?: string;
  /** Free-text search matching name. */
  readonly search?: string;
}

export interface TradingAccountListSort {
  readonly field: TradingAccountSortField;
  readonly direction: SortDirection;
}

export interface TradingAccountListPagination {
  readonly page: number;
  readonly pageSize: number;
}

/**
 * Public DTO for a Trading Account.
 */
export interface TradingAccountDto {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly type: string;
  readonly currency: string;
  readonly initialBalance: DecimalString | null;
  readonly currentBalance: DecimalString | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input for creating a Trading Account.
 */
export interface CreateTradingAccountInput {
  readonly name: string;
  readonly type?: string;
  readonly currency?: string;
  readonly initialBalance?: DecimalString | null;
  readonly currentBalance?: DecimalString | null;
  readonly isActive?: boolean;
}

/**
 * Input for updating a Trading Account.
 */
export interface UpdateTradingAccountInput {
  readonly name?: string;
  readonly type?: string;
  readonly currency?: string;
  readonly initialBalance?: DecimalString | null;
  readonly currentBalance?: DecimalString | null;
  readonly isActive?: boolean;
}

/**
 * Result wrapper for listTradingAccounts.
 */
export interface TradingAccountListResult {
  readonly items: ReadonlyArray<TradingAccountDto>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
