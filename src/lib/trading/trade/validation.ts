/**
 * Trade Domain — Validation
 *
 * Server-side validation for Trade input DTOs.
 *
 * Design goals:
 * - Validation is a pure, synchronous function — no database calls.
 * - Domain invariants that require DB lookups (e.g. confirming a
 *   tradingAccountId belongs to the caller) are handled in the service layer.
 * - Field-level errors are collected and returned together so that
 *   callers can surface all problems at once, not just the first one.
 *
 * Rules are derived strictly from the Prisma schema and domain logic:
 * - quantity must be positive
 * - prices must be positive where supplied
 * - riskAmount cannot be negative
 * - costs cannot be negative
 * - closed trades require exit information
 * - dates must be logically ordered
 * - LONG/SHORT must remain strongly typed
 */

import type {
  DecimalString,
  TradeSideValue,
  TradeStatusValue,
} from "./types";
import type { FieldError } from "./errors";

/**
 * Known decimal string pattern.
 * Matches integers, decimals, and negatives — not scientific notation.
 */
const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

/** Maximum supported decimal places (schema has 8 for prices, 2 for monetary). */
const MAX_PRICE_DECIMAL_PLACES = 8;
const MAX_MONETARY_DECIMAL_PLACES = 2;
const MAX_QUANTITY_DECIMAL_PLACES = 8;
const MAX_RATIO_DECIMAL_PLACES = 2;

/** Positive number: must not start with '-' and must be > 0 numerically. */
const POSITIVE_DECIMAL_RE = /^-?\d+(\.\d+)?$/;

const VALID_SIDES: TradeSideValue[] = ["LONG", "SHORT"];
const VALID_STATUSES: TradeStatusValue[] = ["OPEN", "CLOSED", "CANCELLED"];

// ---------------------------------------------------------------------------
// Primitive validators
// ---------------------------------------------------------------------------

function isValidDecimalString(value: unknown): value is DecimalString {
  return typeof value === "string" && DECIMAL_RE.test(value);
}

function isPositiveDecimalString(value: unknown): boolean {
  return (
    isValidDecimalString(value) &&
    POSITIVE_DECIMAL_RE.test(value) &&
    parseFloat(value) > 0
  );
}

function isNonNegativeDecimalString(value: unknown): boolean {
  if (!isValidDecimalString(value)) return false;
  // Explicitly reject negative numbers — the regex alone doesn't distinguish
  // 0.00 from -0.00 (both match `^-?\d+(\.\d+)?$`).
  return !value.toString().startsWith("-");
}

function decimalPlaces(value: string): number {
  const idx = value.indexOf(".");
  return idx === -1 ? 0 : value.length - idx - 1;
}

function validateDecimalString(
  value: unknown,
  field: string,
  maxDecimals: number,
): FieldError | null {
  if (typeof value !== "string") {
    return { path: field, message: `${field} must be a string` };
  }
  if (!isValidDecimalString(value)) {
    return {
      path: field,
      message: `${field} must be a valid decimal number`,
    };
  }
  if (decimalPlaces(value) > maxDecimals) {
    return {
      path: field,
      message: `${field} must have at most ${maxDecimals} decimal places`,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Field-level validators
// ---------------------------------------------------------------------------

function validateIdField(value: unknown, field: string): FieldError | null {
  if (value === undefined || value === null) {
    return { path: field, message: `${field} is required` };
  }
  if (typeof value !== "string" || value.trim() === "") {
    return { path: field, message: `${field} must be a non-empty string` };
  }
  return null;
}

function validateSide(value: unknown): FieldError | null {
  if (value === undefined || value === null) {
    return { path: "side", message: "side is required" };
  }
  if (typeof value !== "string" || !VALID_SIDES.includes(value as TradeSideValue)) {
    return {
      path: "side",
      message: `side must be one of: ${VALID_SIDES.join(", ")}`,
    };
  }
  return null;
}

function validateStatus(value: unknown): FieldError | null {
  if (value === undefined || value === null) return null; // optional
  if (typeof value !== "string" || !VALID_STATUSES.includes(value as TradeStatusValue)) {
    return {
      path: "status",
      message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
    };
  }
  return null;
}

function validateEntryPrice(value: unknown): FieldError | null {
  const err = validateDecimalString(value, "entryPrice", MAX_PRICE_DECIMAL_PLACES);
  if (err) return err;
  if (!isPositiveDecimalString(value)) {
    return { path: "entryPrice", message: "entryPrice must be a positive number" };
  }
  return null;
}

function validatePositivePrice(
  value: unknown,
  field: string,
): FieldError | null {
  if (value === undefined || value === null) return null; // nullable
  const err = validateDecimalString(value, field, MAX_PRICE_DECIMAL_PLACES);
  if (err) return err;
  if (!isPositiveDecimalString(value)) {
    return { path: field, message: `${field} must be a positive number` };
  }
  return null;
}

function validateNonNegativeMonetary(
  value: unknown,
  field: string,
): FieldError | null {
  if (value === undefined || value === null) return null; // nullable
  const err = validateDecimalString(value, field, MAX_MONETARY_DECIMAL_PLACES);
  if (err) return err;
  if (!isNonNegativeDecimalString(value)) {
    return {
      path: field,
      message: `${field} cannot be negative`,
    };
  }
  return null;
}

function validateQuantity(value: unknown): FieldError | null {
  const err = validateDecimalString(value, "quantity", MAX_QUANTITY_DECIMAL_PLACES);
  if (err) return err;
  if (!isPositiveDecimalString(value)) {
    return { path: "quantity", message: "quantity must be a positive number" };
  }
  return null;
}

function validateDate(value: unknown, field: string): FieldError | null {
  if (value === undefined || value === null) {
    return { path: field, message: `${field} is required` };
  }
  if (!(value instanceof Date)) {
    return { path: field, message: `${field} must be a Date` };
  }
  if (isNaN(value.getTime())) {
    return { path: field, message: `${field} must be a valid date` };
  }
  return null;
}

function validateOptionalDate(
  value: unknown,
  field: string,
): FieldError | null {
  if (value === undefined || value === null) return null; // nullable
  if (!(value instanceof Date)) {
    return { path: field, message: `${field} must be a Date` };
  }
  if (isNaN(value.getTime())) {
    return { path: field, message: `${field} must be a valid date` };
  }
  return null;
}

function validateRiskAmount(value: unknown): FieldError | null {
  if (value === undefined || value === null) return null;
  const err = validateDecimalString(value, "riskAmount", MAX_MONETARY_DECIMAL_PLACES);
  if (err) return err;
  if (!isNonNegativeDecimalString(value)) {
    return { path: "riskAmount", message: "riskAmount cannot be negative" };
  }
  return null;
}

function validatePlannedRiskReward(value: unknown): FieldError | null {
  if (value === undefined || value === null) return null;
  const err = validateDecimalString(value, "plannedRiskReward", MAX_RATIO_DECIMAL_PLACES);
  if (err) return err;
  if (!isPositiveDecimalString(value)) {
    return {
      path: "plannedRiskReward",
      message: "plannedRiskReward must be a positive number",
    };
  }
  return null;
}

function validateOptionalString(
  value: unknown,
  field: string,
  maxLength?: number,
): FieldError | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    return { path: field, message: `${field} must be a string` };
  }
  if (maxLength !== undefined && value.length > maxLength) {
    return {
      path: field,
      message: `${field} must be at most ${maxLength} characters`,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cross-field / domain invariant validators
// ---------------------------------------------------------------------------

/**
 * Validates that a closed trade has all required exit fields.
 * Call this after all field-level errors are resolved.
 */
function validateClosedTradeFields(
  status: TradeStatusValue,
  exitPrice: unknown,
  exitDate: unknown,
  entryDate: Date,
): FieldError | null {
  if (status !== "CLOSED") return null;

  if (exitPrice === undefined || exitPrice === null) {
    return { path: "exitPrice", message: "exitPrice is required when status is CLOSED" };
  }
  if (exitDate === undefined || exitDate === null) {
    return { path: "exitDate", message: "exitDate is required when status is CLOSED" };
  }

  if (exitDate instanceof Date && entryDate instanceof Date) {
    if (exitDate < entryDate) {
      return {
        path: "exitDate",
        message: "exitDate cannot be before entryDate",
      };
    }
  }

  return null;
}

/**
 * Validates date ordering: exitDate should not be before entryDate
 * when both are provided.
 */
function validateDateOrdering(
  entryDate: Date,
  exitDate: unknown,
): FieldError | null {
  if (exitDate === null || exitDate === undefined) return null;
  if (!(exitDate instanceof Date)) return null;
  if (isNaN(exitDate.getTime())) return null;

  if (exitDate < entryDate) {
    return {
      path: "exitDate",
      message: "exitDate cannot be before entryDate",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Top-level validators
// ---------------------------------------------------------------------------

export interface ValidationResult {
  readonly errors: ReadonlyArray<FieldError>;
  readonly isValid: boolean;
}

/** Alias used by the public domain barrel. */
export type TradeValidationResult = ValidationResult;

function toResult(errors: FieldError[]): ValidationResult {
  return { errors: Object.freeze(errors), isValid: errors.length === 0 };
}

/**
 * Validates a CreateTradeInput payload.
 *
 * Domain invariants checked:
 * - Required fields are present and well-typed.
 * - Decimal fields respect precision limits.
 * - Monetary fields (riskAmount, costs) cannot be negative.
 * - Positive fields (quantity, prices) must be positive.
 * - Side is a valid TradeSideValue.
 * - If status is CLOSED, exitPrice and exitDate must be present.
 * - exitDate must not precede entryDate.
 */
export function validateCreateTradeInput(
  input: unknown,
): ValidationResult {
  const errors: FieldError[] = [];

  if (input === null || input === undefined || typeof input !== "object") {
    return toResult([{ path: "", message: "Trade input is required" }]);
  }

  const data = input as Record<string, unknown>;

  // Required
  const tradingAccountIdErr = validateIdField(data.tradingAccountId, "tradingAccountId");
  if (tradingAccountIdErr) errors.push(tradingAccountIdErr);

  const sideErr = validateSide(data.side);
  if (sideErr) errors.push(sideErr);

  const entryPriceErr = validateEntryPrice(data.entryPrice);
  if (entryPriceErr) errors.push(entryPriceErr);

  const entryDateErr = validateDate(data.entryDate, "entryDate");
  if (entryDateErr) errors.push(entryDateErr);

  const quantityErr = validateQuantity(data.quantity);
  if (quantityErr) errors.push(quantityErr);

  // Status (optional, defaults handled by service)
  const statusErr = validateStatus(data.status);
  if (statusErr) errors.push(statusErr);

  // Optional prices
  const exitPriceErr = validatePositivePrice(data.exitPrice, "exitPrice");
  if (exitPriceErr) errors.push(exitPriceErr);

  const stopLossErr = validatePositivePrice(data.stopLoss, "stopLoss");
  if (stopLossErr) errors.push(stopLossErr);

  const takeProfitErr = validatePositivePrice(data.takeProfit, "takeProfit");
  if (takeProfitErr) errors.push(takeProfitErr);

  // Optional monetary
  const riskAmountErr = validateRiskAmount(data.riskAmount);
  if (riskAmountErr) errors.push(riskAmountErr);

  const plannedRiskRewardErr = validatePlannedRiskReward(data.plannedRiskReward);
  if (plannedRiskRewardErr) errors.push(plannedRiskRewardErr);

  const commissionErr = validateNonNegativeMonetary(data.commission, "commission");
  if (commissionErr) errors.push(commissionErr);

  const feesErr = validateNonNegativeMonetary(data.fees, "fees");
  if (feesErr) errors.push(feesErr);

  const swapErr = validateNonNegativeMonetary(data.swap, "swap");
  if (swapErr) errors.push(swapErr);

  const grossPnlErr = validateNonNegativeMonetary(data.grossPnl, "grossPnl");
  if (grossPnlErr) errors.push(grossPnlErr);

  const netPnlErr = validateNonNegativeMonetary(data.netPnl, "netPnl");
  if (netPnlErr) errors.push(netPnlErr);

  // Optional strings
  const titleErr = validateOptionalString(data.title, "title", 255);
  if (titleErr) errors.push(titleErr);

  const notesErr = validateOptionalString(data.notes, "notes", 5000);
  if (notesErr) errors.push(notesErr);

  const strategyIdErr = validateOptionalString(data.strategyId, "strategyId");
  if (strategyIdErr) errors.push(strategyIdErr);

  const setupIdErr = validateOptionalString(data.setupId, "setupId");
  if (setupIdErr) errors.push(setupIdErr);

  // Dates
  const exitDateErr = validateOptionalDate(data.exitDate, "exitDate");
  if (exitDateErr) errors.push(exitDateErr);

  // Cross-field domain invariants
  const entryDate = data.entryDate as Date | undefined;
  const status = (data.status as TradeStatusValue | undefined) ?? "OPEN";

  if (entryDate && !(entryDateErr)) {
    const dateOrderingErr = validateDateOrdering(entryDate, data.exitDate);
    if (dateOrderingErr) errors.push(dateOrderingErr);
  }

  if (status === "CLOSED") {
    const closedTradeErr = validateClosedTradeFields(
      status,
      data.exitPrice,
      data.exitDate,
      entryDate ?? new Date(0),
    );
    if (closedTradeErr) errors.push(closedTradeErr);
  }

  return toResult(errors);
}

/**
 * Validates an UpdateTradeInput payload.
 *
 * Unlike create, all fields are optional. However, if a field IS present,
 * it must pass the same rules as in create.
 *
 * Cross-field invariants check the merged shape after applying updates.
 */
export function validateUpdateTradeInput(
  input: unknown,
): ValidationResult {
  const errors: FieldError[] = [];

  if (input === null || input === undefined || typeof input !== "object") {
    return toResult([{ path: "", message: "Update input is required" }]);
  }

  const data = input as Record<string, unknown>;

  if (Object.keys(data).length === 0) {
    return toResult([{ path: "", message: "At least one field must be provided for update" }]);
  }

  // Optional — but if present, must be valid
  if (data.side !== undefined) {
    const sideErr = validateSide(data.side);
    if (sideErr) errors.push(sideErr);
  }

  const statusErr = validateStatus(data.status);
  if (statusErr) errors.push(statusErr);

  if (data.entryPrice !== undefined) {
    const err = validateEntryPrice(data.entryPrice);
    if (err) errors.push(err);
  }

  if (data.quantity !== undefined) {
    const err = validateQuantity(data.quantity);
    if (err) errors.push(err);
  }

  if (data.exitPrice !== undefined) {
    const err = validatePositivePrice(data.exitPrice, "exitPrice");
    if (err) errors.push(err);
  }

  if (data.stopLoss !== undefined) {
    const err = validatePositivePrice(data.stopLoss, "stopLoss");
    if (err) errors.push(err);
  }

  if (data.takeProfit !== undefined) {
    const err = validatePositivePrice(data.takeProfit, "takeProfit");
    if (err) errors.push(err);
  }

  if (data.riskAmount !== undefined) {
    const err = validateRiskAmount(data.riskAmount);
    if (err) errors.push(err);
  }

  if (data.plannedRiskReward !== undefined) {
    const err = validatePlannedRiskReward(data.plannedRiskReward);
    if (err) errors.push(err);
  }

  if (data.commission !== undefined) {
    const err = validateNonNegativeMonetary(data.commission, "commission");
    if (err) errors.push(err);
  }

  if (data.fees !== undefined) {
    const err = validateNonNegativeMonetary(data.fees, "fees");
    if (err) errors.push(err);
  }

  if (data.swap !== undefined) {
    const err = validateNonNegativeMonetary(data.swap, "swap");
    if (err) errors.push(err);
  }

  if (data.grossPnl !== undefined) {
    const err = validateNonNegativeMonetary(data.grossPnl, "grossPnl");
    if (err) errors.push(err);
  }

  if (data.netPnl !== undefined) {
    const err = validateNonNegativeMonetary(data.netPnl, "netPnl");
    if (err) errors.push(err);
  }

  const titleErr = validateOptionalString(data.title, "title", 255);
  if (titleErr) errors.push(titleErr);

  const notesErr = validateOptionalString(data.notes, "notes", 5000);
  if (notesErr) errors.push(notesErr);

  if (data.strategyId !== undefined) {
    const err = validateOptionalString(data.strategyId, "strategyId");
    if (err) errors.push(err);
  }

  if (data.setupId !== undefined) {
    const err = validateOptionalString(data.setupId, "setupId");
    if (err) errors.push(err);
  }

  if (data.entryDate !== undefined) {
    const err = validateDate(data.entryDate, "entryDate");
    if (err) errors.push(err);
  }

  if (data.exitDate !== undefined) {
    const err = validateOptionalDate(data.exitDate, "exitDate");
    if (err) errors.push(err);
  }

  // Cross-field: when both entryDate and exitDate are updated together,
  // exitDate must not precede entryDate.
  if (
    data.entryDate instanceof Date &&
    data.exitDate instanceof Date &&
    !isNaN(data.entryDate.getTime()) &&
    !isNaN(data.exitDate.getTime())
  ) {
    if (data.exitDate < data.entryDate) {
      errors.push({
        path: "exitDate",
        message: "exitDate cannot be before entryDate",
      });
    }
  }

  return toResult(errors);
}

/**
 * Validates the merged shape of an existing trade plus an update.
 * Used after applying the update to confirm the resulting state is valid.
 *
 * Specifically checks:
 * - If status becomes CLOSED, exitPrice and exitDate must be present.
 * - If exitDate is updated, it must not precede entryDate.
 */
export function validateMergedTradeShape(params: {
  status: TradeStatusValue;
  entryDate: Date;
  exitPrice: unknown;
  exitDate: unknown;
}): ValidationResult {
  const errors: FieldError[] = [];

  if (params.status === "CLOSED") {
    const err = validateClosedTradeFields(
      params.status,
      params.exitPrice,
      params.exitDate,
      params.entryDate,
    );
    if (err) errors.push(err);
  }

  if (params.exitDate instanceof Date && params.entryDate instanceof Date) {
    if (params.exitDate < params.entryDate) {
      errors.push({
        path: "exitDate",
        message: "exitDate cannot be before entryDate",
      });
    }
  }

  return toResult(errors);
}
