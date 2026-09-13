/**
 * Import Domain — Normalization
 *
 * Deterministic normalization of source-specific values into canonical domain values.
 * Preserves decimal precision for all financial fields without floating-point math.
 */

import { TradeSideValue, TradeStatusValue, DecimalString } from "@/lib/trading/trade/types";
import { TradeSide, TradeStatus } from "@prisma/client";

// Regex for extracting numeric values from strings like "$1,234.56" or "- 100 EUR"
const NUMERIC_REGEX = /(-?)\s*[\D]*?(\d[\d,\.]*)/;

export function normalizeDecimal(value: string | number | null | undefined): DecimalString | null {
  if (value === null || value === undefined || value === "") return null;
  
  const str = String(value).trim();
  if (!str) return null;

  // Extract purely numeric part
  const match = str.match(NUMERIC_REGEX);
  if (!match) return null;

  const sign = match[1] === "-" ? "-" : "";
  const numberStr = match[2];

  // Remove thousands commas
  const normalizedStr = numberStr.replace(/,/g, "");

  const parsed = Number(sign + normalizedStr);
  if (Number.isNaN(parsed)) return null;

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
  
  if (["BUY", "LONG", "B", "L", "CALL", "OPEN BUY"].includes(normalized)) {
    return TradeSide.LONG;
  }
  
  if (["SELL", "SHORT", "S", "PUT", "OPEN SELL"].includes(normalized)) {
    return TradeSide.SHORT;
  }
  
  return null;
}

export function normalizeStatus(value: string | null | undefined): TradeStatusValue | null {
  if (!value) return null;
  
  const normalized = value.trim().toUpperCase();
  
  if (["OPEN", "ACTIVE", "O", "IN PROGRESS"].includes(normalized)) {
    return TradeStatus.OPEN;
  }
  
  if (["CLOSED", "FILLED", "DONE", "C", "COMPLETE", "COMPLETED", "EXECUTED"].includes(normalized)) {
    return TradeStatus.CLOSED;
  }
  
  if (["CANCELLED", "CANCELED", "X", "REJECTED"].includes(normalized)) {
    return TradeStatus.CANCELLED;
  }
  
  return null;
}

export interface NormalizeDateOptions {
  timezone?: string; // e.g. "UTC", "+02:00", "-05:00"
}

export function normalizeDate(
  value: string | number | Date | null | undefined,
  options?: NormalizeDateOptions
): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  // Excel serial date handling: numbers between 25000 (~1968) and 60000 (~2064)
  if (typeof value === "number") {
    if (value > 25000 && value < 65000) {
      // Excel epoch starts at Jan 1 1900, with Excel leap year bug offset
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const msPerDay = 24 * 60 * 60 * 1000;
      const date = new Date(excelEpoch.getTime() + value * msPerDay);
      return isNaN(date.getTime()) ? null : date;
    }
    // Standard Unix timestamp in milliseconds
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  const rawStr = String(value).trim();
  if (!rawStr) return null;

  // 1. Check for standard broker formats: YYYY.MM.DD HH:mm:ss or YYYY/MM/DD HH:mm:ss
  const brokerIsoMatch = rawStr.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (brokerIsoMatch) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = brokerIsoMatch;
    const isoString = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${ss.padStart(2, "0")}`;
    
    if (options?.timezone) {
      const tz = options.timezone.trim();
      const tzOffset = tz === "UTC" ? "Z" : tz.startsWith("+") || tz.startsWith("-") ? tz : `Z`;
      const withTz = new Date(`${isoString}${tzOffset}`);
      if (!isNaN(withTz.getTime())) return withTz;
    }
    const localParsed = new Date(isoString);
    if (!isNaN(localParsed.getTime())) return localParsed;
  }

  // 2. Check for DD/MM/YYYY or DD.MM.YYYY
  const euDateMatch = rawStr.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (euDateMatch) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = euDateMatch;
    // Check if month is valid <= 12
    if (Number(m) <= 12 && Number(d) <= 31) {
      const isoString = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${ss.padStart(2, "0")}`;
      if (options?.timezone) {
        const tz = options.timezone.trim();
        const tzOffset = tz === "UTC" ? "Z" : tz.startsWith("+") || tz.startsWith("-") ? tz : `Z`;
        const withTz = new Date(`${isoString}${tzOffset}`);
        if (!isNaN(withTz.getTime())) return withTz;
      }
      const localParsed = new Date(isoString);
      if (!isNaN(localParsed.getTime())) return localParsed;
    }
  }

  // 3. Fallback standard Date parse
  const parsed = new Date(rawStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

export function normalizeString(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = String(value).trim();
  return trimmed === "" ? undefined : trimmed;
}
