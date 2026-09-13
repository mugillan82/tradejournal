import { NormalizedTradeCandidate } from "../import/types";
import { TradeSideValue, TradeStatusValue } from "../trade/types";

/**
 * Parses and cleans OCR numeric strings preserving signs, decimals, and rejecting ambiguous values.
 */
export function normalizeOcrDecimal(val?: string): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;

  let isNegative = false;
  let str = trimmed;

  // Check parenthesized negative e.g. (100.50)
  if (str.startsWith("(") && str.endsWith(")")) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  }

  // Check leading/trailing minus or currency symbols
  if (str.startsWith("-") || str.endsWith("-")) {
    isNegative = true;
    str = str.replace(/-/g, "").trim();
  }

  // Strip currency symbols and whitespace
  str = str.replace(/[$€£¥₹\s]/g, "");

  // If after stripping it still has minus
  if (str.startsWith("-")) {
    isNegative = true;
    str = str.slice(1);
  }

  // Handle European comma decimal: e.g. "1234,56" vs "1,234.56"
  if (str.includes(",") && !str.includes(".")) {
    const parts = str.split(",");
    if (parts.length === 2) {
      str = `${parts[0]}.${parts[1]}`;
    } else {
      str = str.replace(/,/g, "");
    }
  } else {
    // Comma as thousands separator
    str = str.replace(/,/g, "");
  }

  // Ambiguity check: cannot have multiple dots or non-digit characters
  if (!/^\d+(?:\.\d+)?$/.test(str)) {
    return undefined; // Ambiguous or malformed OCR number
  }

  // Check for NaN
  const num = Number(str);
  if (isNaN(num)) return undefined;

  const result = isNegative && num > 0 ? `-${str}` : str;
  return result;
}

/**
 * Parses OCR date strings safely without silently defaulting to current time if missing.
 */
export function normalizeOcrDate(val?: string): Date | undefined {
  if (!val) return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;

  // Replace dots in dates like 2023.10.01 -> 2023-10-01
  const sanitized = trimmed.replace(/^(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3");
  const parsed = new Date(sanitized);

  if (isNaN(parsed.getTime())) {
    return undefined; // Malformed date
  }

  return parsed;
}

export function normalizeRawCandidate(
  raw: Partial<Record<string, string>>,
  index: number
): NormalizedTradeCandidate {
  const candidateId = `smart-${Date.now()}-${index}`;

  // Side normalization
  let side: TradeSideValue | undefined = undefined;
  if (raw.side) {
    const s = raw.side.toUpperCase();
    if (s === "SHORT" || s === "SELL") {
      side = "SHORT";
    } else if (s === "LONG" || s === "BUY") {
      side = "LONG";
    }
  }

  // Status determination
  let status: TradeStatusValue = "CLOSED";
  if (raw.status) {
    const s = raw.status.toUpperCase();
    if (s === "OPEN" || s === "ACTIVE") status = "OPEN";
  } else if (!raw.exitDate && !raw.exitPrice && !raw.grossPnl && !raw.netPnl) {
    status = "OPEN";
  }

  const entryDate = normalizeOcrDate(raw.entryDate);
  const exitDate = normalizeOcrDate(raw.exitDate);

  const quantity = normalizeOcrDecimal(raw.quantity);
  const entryPrice = normalizeOcrDecimal(raw.entryPrice);
  const exitPrice = normalizeOcrDecimal(raw.exitPrice);
  const grossPnl = normalizeOcrDecimal(raw.grossPnl);
  const netPnl = normalizeOcrDecimal(raw.netPnl);
  const commission = normalizeOcrDecimal(raw.commission);
  const fees = normalizeOcrDecimal(raw.fees);
  const swap = normalizeOcrDecimal(raw.swap);
  const stopLoss = normalizeOcrDecimal(raw.stopLoss);
  const takeProfit = normalizeOcrDecimal(raw.takeProfit);

  return {
    candidateId,
    tradingAccountId: "", // To be filled by the service/preview
    externalReference: raw.externalReference,
    side,
    status,
    title: raw.title ? raw.title.toUpperCase().replace(/[^A-Z0-9.\-_]/g, "") : undefined,
    quantity,
    entryPrice,
    exitPrice,
    entryDate,
    exitDate,
    stopLoss,
    takeProfit,
    grossPnl,
    netPnl,
    commission,
    fees,
    swap,
    notes: raw.notes,

    // Will be populated by validation and confidence engine
    validationIssues: [],
    confidence: { score: 1, level: "HIGH", reasons: [] },
    duplicateMatch: { classification: "NONE", reasons: [] },
    isValid: true,
  };
}
