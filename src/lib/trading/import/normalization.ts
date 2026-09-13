/**
 * Import Domain — Normalization
 *
 * Deterministic normalization of source-specific values into canonical domain values.
 * Does not use AI.
 */

import { TradeSideValue, TradeStatusValue, DecimalString } from "@/lib/trading/trade/types";
import { TradeSide, TradeStatus } from "@prisma/client";

// Regex for extracting numeric values from strings like "$1,234.56" or "- 100 EUR"
// This pattern matches optional minus sign, optional spaces, and then digits with optional decimal.
const NUMERIC_REGEX = /(-?)\s*[\D]*?(\d[\d,\.]*)/;

export function normalizeDecimal(value: string | number | null | undefined): DecimalString | null {
  if (value === null || value === undefined || value === "") return null;
  
  const str = String(value).trim();
  if (!str) return null;

  // Extract purely numeric part, handling commas
  const match = str.match(NUMERIC_REGEX);
  if (!match) return null;

  const sign = match[1] === "-" ? "-" : "";
  const numberStr = match[2];

  // Remove commas, and if multiple periods exist, keep only the last one (rare edge case, but safe)
  // Actually, we'll just remove all commas and assume period is the decimal separator.
  // EU format (1.234,56) vs US format (1,234.56) is tricky.
  // For this batch, we assume US format (comma for thousands, period for decimal).
  const normalizedStr = numberStr.replace(/,/g, "");

  const parsed = Number(sign + normalizedStr);
  if (Number.isNaN(parsed)) return null;

  // Preserve string form for DecimalString to avoid floating point issues if it was passed cleanly,
  // but since we manipulated it, we might lose some precision if we use `Number`.
  // Instead, construct the clean string.
  const cleanString = sign + normalizedStr;
  
  // Basic validation that it's a valid decimal string
  if (/^-?\d+(\.\d+)?$/.test(cleanString)) {
    return cleanString as DecimalString;
  }
  
  return null;
}

export function normalizeSide(value: string | null | undefined): TradeSideValue | null {
  if (!value) return null;
  
  const normalized = value.trim().toUpperCase();
  
  if (["BUY", "LONG", "B", "L"].includes(normalized)) {
    return TradeSide.LONG;
  }
  
  if (["SELL", "SHORT", "S"].includes(normalized)) {
    return TradeSide.SHORT;
  }
  
  return null;
}

export function normalizeStatus(value: string | null | undefined): TradeStatusValue | null {
  if (!value) return null;
  
  const normalized = value.trim().toUpperCase();
  
  if (["OPEN", "ACTIVE", "O"].includes(normalized)) {
    return TradeStatus.OPEN;
  }
  
  if (["CLOSED", "FILLED", "DONE", "C"].includes(normalized)) {
    return TradeStatus.CLOSED;
  }
  
  if (["CANCELLED", "CANCELED", "X"].includes(normalized)) {
    return TradeStatus.CANCELLED;
  }
  
  return null;
}

export function normalizeDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  // If it's a number, it could be a timestamp or Excel date.
  // For now, treat it as a unix timestamp (ms) if it's large enough, otherwise let Date parse it.
  if (typeof value === "number") {
    // Basic heuristic: if it's less than 3000000000, it might be seconds. 
    // This is risky, so we just use new Date(value).
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Try standard parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d;
  }

  // Could add more advanced date parsing here (e.g. DD/MM/YYYY) if standard Date.parse fails.
  // But for this foundation, standard parsing is sufficient.
  
  return null;
}

export function normalizeString(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = String(value).trim();
  return trimmed === "" ? undefined : trimmed;
}
