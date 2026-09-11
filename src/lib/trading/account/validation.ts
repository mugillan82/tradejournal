/**
 * Trading Account Domain — Validation
 *
 * Server-side validation for Trading Account input DTOs.
 * Pure, synchronous validation functions with zero database dependencies.
 */

import type { DecimalString } from "./types";
import type { FieldError } from "../trade/errors";

const DECIMAL_RE = /^-?\d+(\.\d+)?$/;
const MAX_MONETARY_DECIMAL_PLACES = 2;
const CURRENCY_RE = /^[A-Z]{3}$/;
const VALID_ACCOUNT_TYPES = ["SIMULATION", "PAPER_TRADING", "LIVE", "DEMO"];

function isValidDecimalString(value: unknown): value is DecimalString {
  return typeof value === "string" && DECIMAL_RE.test(value);
}

function isNonNegativeDecimalString(value: unknown): boolean {
  if (!isValidDecimalString(value)) return false;
  return !value.startsWith("-");
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
    return { path: field, message: `${field} must be a valid decimal number` };
  }
  if (decimalPlaces(value) > maxDecimals) {
    return {
      path: field,
      message: `${field} must have at most ${maxDecimals} decimal places`,
    };
  }
  return null;
}

function validateNonNegativeMonetary(
  value: unknown,
  field: string,
): FieldError | null {
  if (value === undefined || value === null) return null;
  const err = validateDecimalString(value, field, MAX_MONETARY_DECIMAL_PLACES);
  if (err) return err;
  if (!isNonNegativeDecimalString(value)) {
    return { path: field, message: `${field} cannot be negative` };
  }
  return null;
}

function validateName(value: unknown): FieldError | null {
  if (value === undefined || value === null) {
    return { path: "name", message: "name is required" };
  }
  if (typeof value !== "string" || value.trim() === "") {
    return { path: "name", message: "name must be a non-empty string" };
  }
  if (value.length > 255) {
    return { path: "name", message: "name must be at most 255 characters" };
  }
  return null;
}

function validateType(value: unknown): FieldError | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim() === "") {
    return { path: "type", message: "type must be a non-empty string" };
  }
  if (!VALID_ACCOUNT_TYPES.includes(value)) {
    return {
      path: "type",
      message: `type must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`,
    };
  }
  return null;
}

function validateCurrency(value: unknown): FieldError | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !CURRENCY_RE.test(value)) {
    return {
      path: "currency",
      message: "currency must be a valid 3-character uppercase ISO code (e.g. USD)",
    };
  }
  return null;
}

function validateIsActive(value: unknown): FieldError | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") {
    return { path: "isActive", message: "isActive must be a boolean" };
  }
  return null;
}

export interface ValidationResult {
  readonly errors: ReadonlyArray<FieldError>;
  readonly isValid: boolean;
}

function toResult(errors: FieldError[]): ValidationResult {
  return { errors: Object.freeze(errors), isValid: errors.length === 0 };
}

export function validateCreateTradingAccountInput(
  input: unknown,
): ValidationResult {
  const errors: FieldError[] = [];

  if (input === null || input === undefined || typeof input !== "object") {
    return toResult([{ path: "", message: "Trading account input is required" }]);
  }

  const data = input as Record<string, unknown>;

  const nameErr = validateName(data.name);
  if (nameErr) errors.push(nameErr);

  const typeErr = validateType(data.type);
  if (typeErr) errors.push(typeErr);

  const currencyErr = validateCurrency(data.currency);
  if (currencyErr) errors.push(currencyErr);

  const initialBalErr = validateNonNegativeMonetary(data.initialBalance, "initialBalance");
  if (initialBalErr) errors.push(initialBalErr);

  const currentBalErr = validateNonNegativeMonetary(data.currentBalance, "currentBalance");
  if (currentBalErr) errors.push(currentBalErr);

  const isActiveErr = validateIsActive(data.isActive);
  if (isActiveErr) errors.push(isActiveErr);

  return toResult(errors);
}

export function validateUpdateTradingAccountInput(
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

  if (data.name !== undefined) {
    const err = validateName(data.name);
    if (err) errors.push(err);
  }

  if (data.type !== undefined) {
    const err = validateType(data.type);
    if (err) errors.push(err);
  }

  if (data.currency !== undefined) {
    const err = validateCurrency(data.currency);
    if (err) errors.push(err);
  }

  if (data.initialBalance !== undefined) {
    const err = validateNonNegativeMonetary(data.initialBalance, "initialBalance");
    if (err) errors.push(err);
  }

  if (data.currentBalance !== undefined) {
    const err = validateNonNegativeMonetary(data.currentBalance, "currentBalance");
    if (err) errors.push(err);
  }

  if (data.isActive !== undefined) {
    const err = validateIsActive(data.isActive);
    if (err) errors.push(err);
  }

  return toResult(errors);
}
