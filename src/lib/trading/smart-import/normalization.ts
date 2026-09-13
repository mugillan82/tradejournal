import { NormalizedTradeCandidate } from "../import/types";
import { TradeSideValue, TradeStatusValue } from "../trade/types";

export function normalizeRawCandidate(
  raw: Partial<Record<string, string>>,
  index: number
): NormalizedTradeCandidate {
  // We reuse Batch B normalization patterns, but handle specific OCR quirks
  
  const candidateId = `smart-${Date.now()}-${index}`;
  
  // Normalization logic
  let side: TradeSideValue = "LONG";
  if (raw.side) {
    const s = raw.side.toUpperCase();
    if (s === "SHORT" || s === "SELL") side = "SHORT";
  }

  let status: TradeStatusValue = "CLOSED";
  if (raw.status) {
    const s = raw.status.toUpperCase();
    if (s === "OPEN" || s === "ACTIVE") status = "OPEN";
  } else if (!raw.exitDate && !raw.exitPrice && !raw.grossPnl && !raw.netPnl) {
     // If no exit info or P&L, it might be open
     status = "OPEN";
  }

  // Basic cleanup of commas in numbers (OCR might read "1,000.50" or "1.000,50")
  const cleanNumber = (val?: string) => {
    if (!val) return undefined;
    const clean = val.replace(/[^\d\.-]/g, "");
    return clean || undefined;
  };

  const entryDateObj = raw.entryDate ? new Date(raw.entryDate) : undefined;
  const exitDateObj = raw.exitDate ? new Date(raw.exitDate) : undefined;

  return {
    candidateId,
    tradingAccountId: "", // To be filled by the service
    side,
    status,
    title: raw.title?.toUpperCase().replace(/[^A-Z0-9]/g, ""), // clean symbols
    quantity: cleanNumber(raw.quantity) ?? "1",
    entryPrice: cleanNumber(raw.entryPrice) ?? "0",
    exitPrice: cleanNumber(raw.exitPrice),
    entryDate: !isNaN(entryDateObj?.getTime() ?? NaN) ? entryDateObj : new Date(), // Fallback to now if invalid
    exitDate: !isNaN(exitDateObj?.getTime() ?? NaN) ? exitDateObj : undefined,
    grossPnl: cleanNumber(raw.grossPnl),
    netPnl: cleanNumber(raw.netPnl),
    commission: cleanNumber(raw.commission),
    fees: cleanNumber(raw.fees),
    swap: cleanNumber(raw.swap),
    
    // Default placeholders - confidence.ts will populate these
    validationIssues: [],
    confidence: { score: 1, level: "HIGH", reasons: [] },
    duplicateMatch: { classification: "NONE", reasons: [] },
    isValid: true,
  };
}
