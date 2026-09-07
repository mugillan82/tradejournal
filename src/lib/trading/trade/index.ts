/**
 * Trade Domain — Public API
 *
 * Barrel file for the trade domain.
 *
 * Re-exports:
 * - Public DTOs and types (safe for use in client components
 *   for the type definitions, though the service itself is server-only).
 * - The Trade service functions.
 * - The TradeServiceError and error factories.
 *
 * Server-only note: importing this file from a client component
 * is allowed for types only. Calling the service functions
 * (createTrade, etc.) from a client component will fail at build
 * time because they transitively import `server-only`.
 */

export type {
  CreateTradeInput,
  DecimalString,
  TradeDto,
  TradeListFilters,
  TradeListPagination,
  TradeListResult,
  TradeListSort,
  TradeSideValue,
  TradeStatusValue,
  TradeSortField,
  SortDirection,
  UpdateTradeInput,
} from "./types";

export {
  toDecimalString,
} from "./types";

export type { TradeValidationResult } from "./validation";

export {
  validateCreateTradeInput,
  validateUpdateTradeInput,
  validateMergedTradeShape,
} from "./validation";

export type { FieldError, TradeServiceErrorCode } from "./errors";

export {
  TradeServiceError,
  createAuthRequiredError,
  createDatabaseError,
  createForbiddenError,
  createNotFoundError,
  createValidationError,
} from "./errors";

export {
  createTrade,
  deleteTrade,
  getTradeById,
  listTrades,
  updateTrade,
} from "./service";

export type { ListTradesOptions } from "./service";
