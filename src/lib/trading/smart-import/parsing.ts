import { PlatformSource, TradingScreenshotProfile } from "./types";

// Base implementation of profiles
class Mt4Profile implements TradingScreenshotProfile {
  source: PlatformSource = "MT4";
  
  parse(text: string): Partial<Record<string, string>>[] {
    const lines = text.split("\\n").map(l => l.trim()).filter(Boolean);
    const candidates: Partial<Record<string, string>>[] = [];
    
    // Simplistic heuristic parsing for MT4 history line
    // e.g. "12345678 2023.10.01 10:00 buy 0.10 EURUSD 1.0500 1.0400 1.0600 2023.10.01 11:00 1.0550 0.00 0.00 50.00"
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("buy") || lower.includes("sell")) {
        const sideMatch = lower.match(/(buy|sell)/);
        if (!sideMatch) continue;
        
        // Very rough extraction for demonstration/MVP
        // A production parser would use robust regex targeting exact coordinate boundaries if available
        const tokens = line.split(/\s+/);
        
        // Find side index
        const sideIndex = tokens.findIndex(t => t.toLowerCase() === "buy" || t.toLowerCase() === "sell");
        if (sideIndex === -1) continue;
        
        const candidate: Partial<Record<string, string>> = {
          side: tokens[sideIndex].toUpperCase(),
        };

        if (sideIndex > 1) {
          candidate.entryDate = `${tokens[sideIndex - 2]} ${tokens[sideIndex - 1]}`;
        }
        
        if (sideIndex + 1 < tokens.length) {
          candidate.quantity = tokens[sideIndex + 1];
        }

        if (sideIndex + 2 < tokens.length) {
          candidate.title = tokens[sideIndex + 2];
        }

        if (sideIndex + 3 < tokens.length) {
          candidate.entryPrice = tokens[sideIndex + 3];
        }

        // P&L is usually at the end
        if (tokens.length > sideIndex + 3) {
          candidate.grossPnl = tokens[tokens.length - 1];
        }

        candidates.push(candidate);
      }
    }
    
    return candidates;
  }
}

class TradingViewProfile implements TradingScreenshotProfile {
  source: PlatformSource = "TradingView";

  parse(text: string): Partial<Record<string, string>>[] {
    // Basic heuristics for TradingView Order/Position panel
    const lines = text.split("\\n").map(l => l.trim()).filter(Boolean);
    const candidates: Partial<Record<string, string>>[] = [];
    
    let currentCandidate: Partial<Record<string, string>> | null = null;

    for (const line of lines) {
      const lower = line.toLowerCase();
      
      // Look for symbol (often all caps, e.g. AAPL, EURUSD)
      const symbolMatch = line.match(/^[A-Z]{3,6}$/);
      if (symbolMatch && !currentCandidate) {
        currentCandidate = { title: symbolMatch[0] };
        continue;
      }

      if (currentCandidate) {
        if (lower === "long" || lower === "buy") {
          currentCandidate.side = "LONG";
        } else if (lower === "short" || lower === "sell") {
          currentCandidate.side = "SHORT";
        }
        
        if (lower.includes("qty") || lower.includes("quantity")) {
          const numMatch = line.match(/[\d\.]+/);
          if (numMatch) currentCandidate.quantity = numMatch[0];
        }

        if (lower.includes("avg fill") || lower.includes("price")) {
          const numMatch = line.match(/[\d\.]+/);
          if (numMatch) currentCandidate.entryPrice = numMatch[0];
        }

        if (lower.includes("p&l") || lower.includes("profit")) {
          const pnlMatch = line.match(/-?[\d\.,]+/);
          if (pnlMatch) {
            currentCandidate.grossPnl = pnlMatch[0];
            candidates.push(currentCandidate);
            currentCandidate = null; // reset for next
          }
        }
      }
    }
    
    if (currentCandidate) {
      candidates.push(currentCandidate);
    }

    return candidates;
  }
}

class GenericProfile implements TradingScreenshotProfile {
  source: PlatformSource = "Generic Broker";

  parse(text: string): Partial<Record<string, string>>[] {
    const lines = text.split("\\n").map(l => l.trim()).filter(Boolean);
    const candidates: Partial<Record<string, string>>[] = [];
    
    // Just try to find lines that look like trades (have buy/sell, symbol, numbers)
    for (const line of lines) {
      const lower = line.toLowerCase();
      if ((lower.includes("buy") || lower.includes("sell") || lower.includes("long") || lower.includes("short")) && line.match(/[0-9]/)) {
        const candidate: Partial<Record<string, string>> = {};
        
        if (lower.includes("buy") || lower.includes("long")) candidate.side = "LONG";
        if (lower.includes("sell") || lower.includes("short")) candidate.side = "SHORT";

        // Try to guess a symbol (all caps word)
        const symbolMatch = line.match(/\b[A-Z]{3,8}\b/);
        if (symbolMatch && symbolMatch[0] !== "BUY" && symbolMatch[0] !== "SELL" && symbolMatch[0] !== "LONG" && symbolMatch[0] !== "SHORT") {
          candidate.title = symbolMatch[0];
        }

        // Try to guess numbers. Usually quantity, price, P&L
        const numbers = line.match(/-?[0-9]+[.,]?[0-9]*/g);
        if (numbers && numbers.length >= 3) {
          candidate.quantity = numbers[0];
          candidate.entryPrice = numbers[1];
          candidate.grossPnl = numbers[numbers.length - 1];
        } else if (numbers && numbers.length === 2) {
          candidate.entryPrice = numbers[0];
          candidate.grossPnl = numbers[1];
        }

        candidates.push(candidate);
      }
    }

    return candidates;
  }
}

export const PROFILES: Record<PlatformSource, TradingScreenshotProfile> = {
  "MT4": new Mt4Profile(),
  "MT5": new Mt4Profile(), // Reuse MT4 for now
  "TradingView": new TradingViewProfile(),
  "Generic Broker": new GenericProfile(),
};

export function parseOcrText(text: string, source: PlatformSource): Partial<Record<string, string>>[] {
  const profile = PROFILES[source];
  if (!profile) return [];
  return profile.parse(text);
}
