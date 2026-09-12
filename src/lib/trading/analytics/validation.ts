/**
 * Analytics Domain — Validation
 *
 * Pure synchronous validation for analytics filter inputs.
 * Enforces strict typing, rejects unknown/injected properties (e.g. userId),
 * and validates logical date ranges and enum values.
 */

import type { AnalyticsFilterInput } from "./types";
import type { FieldError } from "./errors";

const VALID_SIDES = ["LONG", "SHORT"] as const;
const VALID_STATUSES = ["OPEN", "CLOSED", "CANCELLED"] as const;

const ALLOWED_FILTER_KEYS = new Set([
  "dateFrom",
  "dateTo",
  "tradingAccountId",
  "symbol",
  "side",
  "status",
  "strategyId",
  "setupId",
  "tagId",
  "mistakeId",
]);

export interface AnalyticsValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<FieldError>;
  readonly sanitizedFilter?: AnalyticsFilterInput;
}

function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Validates and sanitizes AnalyticsFilterInput.
 *
 * Checks:
 * - Disallows unknown fields (prevents client-controlled userId or arbitrary properties).
 * - Validates date format and chronological ordering (dateTo cannot precede dateFrom).
 * - Validates enum values for side and status.
 * - Validates string IDs.
 */
export function validateAnalyticsFilterInput(
  input: unknown,
): AnalyticsValidationResult {
  const errors: FieldError[] = [];

  if (input === null || input === undefined) {
    return { isValid: true, errors: [], sanitizedFilter: {} };
  }

  if (typeof input !== "object" || Array.isArray(input)) {
    return {
      isValid: false,
      errors: [{ path: "filter", message: "Filter must be an object" }],
    };
  }

  const raw = input as Record<string, unknown>;

  // Check for unknown keys (reject injection)
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_FILTER_KEYS.has(key)) {
      errors.push({
        path: key,
        message: `Unknown or forbidden filter parameter: '${key}'`,
      });
    }
  }

  const sanitized: Record<string, unknown> = {};

  // Date From
  if (raw.dateFrom !== undefined && raw.dateFrom !== null) {
    const parsed = parseDateValue(raw.dateFrom);
    if (!parsed) {
      errors.push({
        path: "dateFrom",
        message: "dateFrom must be a valid ISO date or Date object",
      });
    } else {
      sanitized.dateFrom = parsed;
    }
  }

  // Date To
  if (raw.dateTo !== undefined && raw.dateTo !== null) {
    const parsed = parseDateValue(raw.dateTo);
    if (!parsed) {
      errors.push({
        path: "dateTo",
        message: "dateTo must be a valid ISO date or Date object",
      });
    } else {
      sanitized.dateTo = parsed;
    }
  }

  // Date ordering
  if (
    sanitized.dateFrom instanceof Date &&
    sanitized.dateTo instanceof Date &&
    sanitized.dateTo < sanitized.dateFrom
  ) {
    errors.push({
      path: "dateTo",
      message: "dateTo cannot be earlier than dateFrom",
    });
  }

  // Trading Account ID
  if (raw.tradingAccountId !== undefined && raw.tradingAccountId !== null) {
    if (typeof raw.tradingAccountId !== "string" || raw.tradingAccountId.trim() === "") {
      errors.push({
        path: "tradingAccountId",
        message: "tradingAccountId must be a non-empty string",
      });
    } else {
      sanitized.tradingAccountId = raw.tradingAccountId.trim();
    }
  }

  // Symbol / Title
  if (raw.symbol !== undefined && raw.symbol !== null) {
    if (typeof raw.symbol !== "string" || raw.symbol.trim() === "") {
      errors.push({
        path: "symbol",
        message: "symbol must be a non-empty string",
      });
    } else {
      sanitized.symbol = raw.symbol.trim();
    }
  }

  // Side
  if (raw.side !== undefined && raw.side !== null) {
    if (
      typeof raw.side !== "string" ||
      !VALID_SIDES.includes(raw.side as (typeof VALID_SIDES)[number])
    ) {
      errors.push({
        path: "side",
        message: `side must be one of: ${VALID_SIDES.join(", ")}`,
      });
    } else {
      sanitized.side = raw.side;
    }
  }

  // Status
  if (raw.status !== undefined && raw.status !== null) {
    if (
      typeof raw.status !== "string" ||
      !VALID_STATUSES.includes(raw.status as (typeof VALID_STATUSES)[number])
    ) {
      errors.push({
        path: "status",
        message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    } else {
      sanitized.status = raw.status;
    }
  }

  // Strategy ID
  if (raw.strategyId !== undefined && raw.strategyId !== null) {
    if (typeof raw.strategyId !== "string" || raw.strategyId.trim() === "") {
      errors.push({
        path: "strategyId",
        message: "strategyId must be a non-empty string",
      });
    } else {
      sanitized.strategyId = raw.strategyId.trim();
    }
  }

  // Setup ID
  if (raw.setupId !== undefined && raw.setupId !== null) {
    if (typeof raw.setupId !== "string" || raw.setupId.trim() === "") {
      errors.push({
        path: "setupId",
        message: "setupId must be a non-empty string",
      });
    } else {
      sanitized.setupId = raw.setupId.trim();
    }
  }

  // Tag ID
  if (raw.tagId !== undefined && raw.tagId !== null) {
    if (typeof raw.tagId !== "string" || raw.tagId.trim() === "") {
      errors.push({
        path: "tagId",
        message: "tagId must be a non-empty string",
      });
    } else {
      sanitized.tagId = raw.tagId.trim();
    }
  }

  // Mistake ID
  if (raw.mistakeId !== undefined && raw.mistakeId !== null) {
    if (typeof raw.mistakeId !== "string" || raw.mistakeId.trim() === "") {
      errors.push({
        path: "mistakeId",
        message: "mistakeId must be a non-empty string",
      });
    } else {
      sanitized.mistakeId = raw.mistakeId.trim();
    }
  }

  return {
    isValid: errors.length === 0,
    errors: Object.freeze(errors),
    sanitizedFilter: errors.length === 0 ? (sanitized as AnalyticsFilterInput) : undefined,
  };
}
