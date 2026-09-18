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

  // Strip leading plus
  if (str.startsWith("+")) {
    str = str.slice(1).trim();
  }

  // Strip currency symbols and whitespace (including space thousands separators e.g. 29 201.87)
  str = str.replace(/[$€£¥₹\s]/g, "");

  // If after stripping it still has minus or plus
  if (str.startsWith("-")) {
    isNegative = true;
    str = str.slice(1);
  } else if (str.startsWith("+")) {
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
  const rawSide = raw.side || raw.type || raw.action;
  if (rawSide) {
    const s = rawSide.toUpperCase();
    if (s.includes("SHORT") || s.includes("SELL")) {
      side = "SHORT";
    } else if (s.includes("LONG") || s.includes("BUY")) {
      side = "LONG";
    }
  }

  // Status determination
  let status: TradeStatusValue = "CLOSED";
  if (raw.status) {
    const s = raw.status.toUpperCase();
    if (s === "OPEN" || s === "ACTIVE") status = "OPEN";
  } else if (!raw.exitDate && !raw.closedAt && !raw.exitPrice && !raw.grossPnl && !raw.netPnl) {
    status = "OPEN";
  }

  // Map title / symbol from all possible extracted keys (e.g. Gemini returns 'symbol', OCR returns 'title')
  const rawTitle = raw.title || raw.symbol || raw.instrument || raw.asset || raw.pair || raw.ticker;
  const title = rawTitle ? rawTitle.toUpperCase().replace(/[^A-Z0-9.\-_/]/g, "").trim() : undefined;

  const rawEntryDate = raw.entryDate || raw.openedAt || raw.openDate || raw.openTime || raw.dateTime || raw.time;
  const rawExitDate = raw.exitDate || raw.closedAt || raw.closeDate || raw.closeTime;

  const parsedEntryDate = normalizeOcrDate(rawEntryDate);
  const exitDate = normalizeOcrDate(rawExitDate);

  // If entryDate is omitted in the screenshot, default to exitDate (or 1 min before exitDate), or today
  let entryDate = parsedEntryDate;
  if (!entryDate) {
    if (exitDate) {
      entryDate = new Date(exitDate.getTime() - 60000);
    } else {
      entryDate = new Date();
    }
  } else if (exitDate && exitDate < entryDate) {
    // If exit date is before entry date due to partial OCR or timestamp rollover, align entryDate
    entryDate = new Date(exitDate.getTime() - 60000);
  }

  let quantity = normalizeOcrDecimal(raw.quantity || raw.volume || raw.lots || raw.size);
  if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
    quantity = "0.01";
  }
  const entryPrice = normalizeOcrDecimal(raw.entryPrice || raw.openPrice || raw.price);
  const exitPrice = normalizeOcrDecimal(raw.exitPrice || raw.closePrice);
  const rawGrossPnl = normalizeOcrDecimal(raw.grossPnl || raw.profit || raw.pnl);
  const rawNetPnl = normalizeOcrDecimal(raw.netPnl);
  const grossPnl = rawGrossPnl ?? rawNetPnl;
  const netPnl = rawNetPnl ?? rawGrossPnl;
  const commission = normalizeOcrDecimal(raw.commission);
  const fees = normalizeOcrDecimal(raw.fees);
  const swap = normalizeOcrDecimal(raw.swap);
  const stopLoss = normalizeOcrDecimal(raw.stopLoss || raw.sl);
  const takeProfit = normalizeOcrDecimal(raw.takeProfit || raw.tp);
  const externalReference = raw.externalReference || raw.externalIdentifier || raw.ticket || raw.orderId || raw.positionId;

  return {
    candidateId,
    tradingAccountId: "", // To be filled by the service/preview
    externalReference,
    side: side || "LONG",
    status,
    title,
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
