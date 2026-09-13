import { SourceDetectionResult, PlatformSource } from "./types";

/**
 * Heuristic-based platform detection based on OCR text density.
 */
export function detectSource(ocrText: string): SourceDetectionResult {
  const normalized = ocrText.toLowerCase();

  const scores: Record<PlatformSource, { score: number; evidence: string[] }> = {
    "MT4": { score: 0, evidence: [] },
    "MT5": { score: 0, evidence: [] },
    "TradingView": { score: 0, evidence: [] },
    "Generic Broker": { score: 0, evidence: [] },
  };

  // MT4 / MT5 Signatures
  if (normalized.includes("ticket") || normalized.includes("order")) {
    scores.MT4.score += 10;
    scores.MT4.evidence.push("ticket/order keyword found");
    scores.MT5.score += 10;
    scores.MT5.evidence.push("ticket/order keyword found");
  }
  if (normalized.match(/s[\\/ ]*l/)) {
    scores.MT4.score += 5;
    scores.MT4.evidence.push("S/L found");
    scores.MT5.score += 5;
    scores.MT5.evidence.push("S/L found");
  }
  if (normalized.match(/t[\\/ ]*p/)) {
    scores.MT4.score += 5;
    scores.MT4.evidence.push("T/P found");
    scores.MT5.score += 5;
    scores.MT5.evidence.push("T/P found");
  }
  
  if (normalized.includes("deal") || normalized.includes("deals")) {
    scores.MT5.score += 20; // MT5 uses "Deals" and "Positions" more distinctively
    scores.MT5.evidence.push("deal keyword strongly implies MT5");
  }

  // TradingView Signatures
  if (normalized.includes("tradingview") || normalized.includes("paper trading")) {
    scores.TradingView.score += 50;
    scores.TradingView.evidence.push("Explicit TradingView branding found");
  }
  if (normalized.includes("qty") && normalized.includes("avg fill")) {
    scores.TradingView.score += 20;
    scores.TradingView.evidence.push("TradingView-style columns found");
  }

  let bestSource: PlatformSource = "Generic Broker";
  let bestScore = 0;

  for (const [source, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestSource = source as PlatformSource;
    }
  }

  // Fallback if score is too low
  if (bestScore < 15) {
    bestSource = "Generic Broker";
    return {
      source: bestSource,
      confidence: 0.3, // low confidence
      evidence: ["Insufficient platform-specific markers, falling back to generic"],
    };
  }

  return {
    source: bestSource,
    confidence: Math.min(1.0, bestScore / 50 + 0.4),
    evidence: scores[bestSource].evidence,
  };
}
