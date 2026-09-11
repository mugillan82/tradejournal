/**
 * Trading Domain Module — Public API
 *
 * Top-level barrel for all trading domain types and services.
 *
 * Current sub-domains:
 * - trade/
 * - account/
 */

export * from "./trade";

export type {
  TradingAccountTypeValue,
  TradingAccountSortField,
  TradingAccountListFilters,
  TradingAccountListSort,
  TradingAccountListPagination,
  TradingAccountDto,
  CreateTradingAccountInput,
  UpdateTradingAccountInput,
  TradingAccountListResult,
} from "./account";

export {
  createTradingAccount,
  getTradingAccountById,
  listTradingAccounts,
  updateTradingAccount,
  deleteTradingAccount,
} from "./account";

