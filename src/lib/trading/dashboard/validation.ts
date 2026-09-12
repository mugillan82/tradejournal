/**
 * Dashboard Domain — Validation
 *
 * Validates dashboard filter parameters.
 */

import type { DashboardFilterInput } from "./types";
import type { FieldError } from "./errors";

export interface DashboardValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<FieldError>;
  readonly sanitizedInput?: DashboardFilterInput;
}

const ALLOWED_KEYS = new Set(["tradingAccountId", "dateFrom", "dateTo"]);

export function validateDashboardFilterInput(rawInput: unknown): DashboardValidationResult {
  if (rawInput === null || rawInput === undefined) {
    return { isValid: true, errors: [], sanitizedInput: {} };
  }

  if (typeof rawInput !== "object" || Array.isArray(rawInput)) {
    return {
      isValid: false,
      errors: [{ field: "filters", message: "Filter input must be an object." }],
    };
  }

  const errors: FieldError[] = [];
  const sanitized: Record<string, unknown> = {};
  const record = rawInput as Record<string, unknown>;

  // Detect unknown keys (security check against injection)
  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key)) {
      errors.push({ field: key, message: `Unknown parameter: ${key}` });
    }
  }

  if (record.tradingAccountId !== undefined && record.tradingAccountId !== null) {
    if (typeof record.tradingAccountId !== "string" || record.tradingAccountId.trim().length === 0) {
      errors.push({ field: "tradingAccountId", message: "Trading account ID must be a non-empty string." });
    } else {
      sanitized.tradingAccountId = record.tradingAccountId.trim();
    }
  }

  let parsedDateFrom: Date | undefined;
  if (record.dateFrom !== undefined && record.dateFrom !== null) {
    if (record.dateFrom instanceof Date) {
      if (isNaN(record.dateFrom.getTime())) {
        errors.push({ field: "dateFrom", message: "Invalid Date object for dateFrom." });
      } else {
        parsedDateFrom = record.dateFrom;
        sanitized.dateFrom = parsedDateFrom;
      }
    } else if (typeof record.dateFrom === "string") {
      const d = new Date(record.dateFrom);
      if (isNaN(d.getTime())) {
        errors.push({ field: "dateFrom", message: "Invalid date string for dateFrom." });
      } else {
        parsedDateFrom = d;
        sanitized.dateFrom = parsedDateFrom;
      }
    } else {
      errors.push({ field: "dateFrom", message: "dateFrom must be a Date or ISO date string." });
    }
  }

  let parsedDateTo: Date | undefined;
  if (record.dateTo !== undefined && record.dateTo !== null) {
    if (record.dateTo instanceof Date) {
      if (isNaN(record.dateTo.getTime())) {
        errors.push({ field: "dateTo", message: "Invalid Date object for dateTo." });
      } else {
        parsedDateTo = record.dateTo;
        sanitized.dateTo = parsedDateTo;
      }
    } else if (typeof record.dateTo === "string") {
      const d = new Date(record.dateTo);
      if (isNaN(d.getTime())) {
        errors.push({ field: "dateTo", message: "Invalid date string for dateTo." });
      } else {
        parsedDateTo = d;
        sanitized.dateTo = parsedDateTo;
      }
    } else {
      errors.push({ field: "dateTo", message: "dateTo must be a Date or ISO date string." });
    }
  }

  if (parsedDateFrom && parsedDateTo && parsedDateFrom.getTime() > parsedDateTo.getTime()) {
    errors.push({ field: "dateRange", message: "dateTo cannot be earlier than dateFrom." });
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [], sanitizedInput: sanitized as DashboardFilterInput };
}
