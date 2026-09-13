import { SourceDetectionResult, PlatformSource } from "./types";

/**
 * Heuristic-based platform detection based on OCR text markers and keyword density.
 */
export function detectSource(ocrText: string): SourceDetectionResult {
  if (!ocrText || !ocrText.trim()) {
    return {
      source: "Generic Broker",
      confidence: 0.2,
      evidence: ["Empty or whitespace OCR text; falling back to Generic Broker"],
    };
  }

  const normalized = ocrText.toLowerCase();

  const scores: Record<PlatformSource, { score: number; evidence: string[] }> = {
    "MT4": { score: 0, evidence: [] },
    "MT5": { score: 0, evidence: [] },
    "TradingView": { score: 0, evidence: [] },
    "Generic Broker": { score: 0, evidence: [] },
  };

  // Explicit Platform Branding
  if (normalized.includes("metatrader 5") || normalized.includes("mt5")) {
    scores.MT5.score += 60;
    scores.MT5.evidence.push("Explicit MetaTrader 5 / MT5 branding detected");
  }

  if (normalized.includes("metatrader 4") || normalized.includes("mt4")) {
    scores.MT4.score += 60;
    scores.MT4.evidence.push("Explicit MetaTrader 4 / MT4 branding detected");
  }

  if (normalized.includes("tradingview") || normalized.includes("paper trading")) {
    scores.TradingView.score += 60;
    scores.TradingView.evidence.push("Explicit TradingView branding detected");
  }

  // MT5 Specific Vocabulary (Deals, Position Direction, Orders)
  if (normalized.includes("deal") || normalized.includes("deals")) {
    scores.MT5.score += 25;
    scores.MT5.evidence.push("MT5 'deal/deals' keyword found");
  }
  if (normalized.match(/\b(in\/out|inout|\bin\b|\bout\b)\s+(deal|volume|price)/)) {
    scores.MT5.score += 20;
    scores.MT5.evidence.push("MT5 deal direction (in/out) pattern detected");
  }

  // MT4 / MT5 Common Indicators
  if (normalized.includes("ticket") || normalized.includes("order")) {
    scores.MT4.score += 15;
    scores.MT4.evidence.push("ticket/order keyword detected");
    scores.MT5.score += 15;
    scores.MT5.evidence.push("ticket/order keyword detected");
  }

  if (normalized.match(/s[\\/ ]*l/) || normalized.includes("stop loss")) {
    scores.MT4.score += 5;
    scores.MT5.score += 5;
    scores.TradingView.score += 5;
  }
  if (normalized.match(/t[\\/ ]*p/) || normalized.includes("take profit")) {
    scores.MT4.score += 5;
    scores.MT5.score += 5;
    scores.TradingView.score += 5;
  }

  // TradingView Specific Vocabulary
  if (normalized.includes("avg fill") || normalized.includes("avg price")) {
    scores.TradingView.score += 30;
    scores.TradingView.evidence.push("TradingView-style 'Avg Fill' column found");
  }
  if (normalized.includes("qty") || normalized.includes("quantity")) {
    scores.TradingView.score += 15;
    scores.TradingView.evidence.push("TradingView-style 'Qty' column found");
  }

  // Broker / Generic fallback markers
  if (normalized.includes("broker") || normalized.includes("statement") || normalized.includes("trade confirmation")) {
    scores["Generic Broker"].score += 10;
    scores["Generic Broker"].evidence.push("Generic statement / broker terms detected");
  }

  let bestSource: PlatformSource = "Generic Broker";
  let bestScore = 0;

  for (const [source, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestSource = source as PlatformSource;
    }
  }

  // Ambiguous or insufficient markers fallback
  if (bestScore < 20) {
    return {
      source: "Generic Broker",
      confidence: 0.35,
      evidence: ["Insufficient platform-specific markers; conservative fallback to Generic Broker"],
    };
  }

  const confidence = Math.min(0.95, Math.max(0.4, bestScore / 80 + 0.3));

  return {
    source: bestSource,
    confidence: Number(confidence.toFixed(2)),
    evidence: scores[bestSource].evidence,
  };
}
