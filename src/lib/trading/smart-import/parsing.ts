import { PlatformSource, TradingScreenshotProfile } from "./types";

/**
 * Splits text safely supporting real CRLF/LF newlines as well as escaped newlines.
 */
function splitLines(text: string): string[] {
  return text
    .split(/\r?\n|\\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Dedicated MT4 Account History / Trade Terminal Profile.
 * Standard MT4 line format:
 * Ticket | Open Time | Type (buy/sell) | Size | Item (Symbol) | Price | S/L | T/P | Close Time | Price | Commission | Taxes | Swap | Profit
 */
export class Mt4Profile implements TradingScreenshotProfile {
  source: PlatformSource = "MT4";

  parse(text: string): Partial<Record<string, string>>[] {
    const lines = splitLines(text);
    const candidates: Partial<Record<string, string>>[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      // Must contain buy or sell
      if (!lower.includes("buy") && !lower.includes("sell")) continue;

      const tokens = line.split(/\s+/);
      const sideIndex = tokens.findIndex((t) => t.toLowerCase() === "buy" || t.toLowerCase() === "sell");
      if (sideIndex === -1) continue;

      const sideRaw = tokens[sideIndex].toLowerCase();
      const side = sideRaw === "buy" ? "LONG" : "SHORT";

      const candidate: Partial<Record<string, string>> = { side };

      // Ticket is usually token 0 if sideIndex >= 3
      if (sideIndex >= 3 && /^\d+$/.test(tokens[0])) {
        candidate.externalReference = tokens[0];
      }

      // Open Date/Time precedes side (e.g. 2023.10.01 10:00:00)
      if (sideIndex >= 2) {
        candidate.entryDate = `${tokens[sideIndex - 2]} ${tokens[sideIndex - 1]}`;
      } else if (sideIndex >= 1) {
        candidate.entryDate = tokens[sideIndex - 1];
      }

      // Size / Volume (quantity) immediately after side
      if (sideIndex + 1 < tokens.length) {
        candidate.quantity = tokens[sideIndex + 1];
      }

      // Symbol / Item
      if (sideIndex + 2 < tokens.length) {
        candidate.title = tokens[sideIndex + 2].toUpperCase();
      }

      // Open Price
      if (sideIndex + 3 < tokens.length) {
        candidate.entryPrice = tokens[sideIndex + 3];
      }

      // Optional S/L and T/P
      if (sideIndex + 4 < tokens.length && !isNaN(Number(tokens[sideIndex + 4]))) {
        candidate.stopLoss = tokens[sideIndex + 4];
      }
      if (sideIndex + 5 < tokens.length && !isNaN(Number(tokens[sideIndex + 5]))) {
        candidate.takeProfit = tokens[sideIndex + 5];
      }

      // Close Time & Close Price if closed trade
      for (let idx = sideIndex + 6; idx < tokens.length - 1; idx++) {
        const token = tokens[idx];
        if (/^\d+\.\d+$/.test(token) && !token.includes(":")) {
          candidate.exitPrice = token;
          candidate.status = "CLOSED";
          break;
        }
      }

      // Trailing numbers: Commission, Swap, Profit
      // MT4 ends with [Commission, Swap/Taxes, Profit] or just [Profit]
      if (tokens.length >= sideIndex + 4) {
        const lastToken = tokens[tokens.length - 1];
        if (/^-?\$?\d+[\.,]?\d*$/.test(lastToken.replace(/[()]/g, ""))) {
          candidate.grossPnl = lastToken;
        }

        if (tokens.length >= sideIndex + 6) {
          const secondLast = tokens[tokens.length - 2];
          const thirdLast = tokens[tokens.length - 3];
          if (/^-?\d+[\.,]?\d*$/.test(secondLast)) {
            candidate.swap = secondLast;
          }
          if (/^-?\d+[\.,]?\d*$/.test(thirdLast)) {
            candidate.commission = thirdLast;
          }
        }
      }

      candidates.push(candidate);
    }

    return candidates;
  }
}

/**
 * Dedicated MT5 Deals / Orders / Positions Profile.
 * MT5 introduces Deals with direction (in, out, inout), Order references, and distinct Deals history table.
 * Standard MT5 deal format:
 * Deal Ticket | Time | Order | Deal Type (buy/sell) | Direction (in/out) | Volume | Price | Commission | Swap | Profit
 */
export class Mt5Profile implements TradingScreenshotProfile {
  source: PlatformSource = "MT5";

  parse(text: string): Partial<Record<string, string>>[] {
    const lines = splitLines(text);
    const candidates: Partial<Record<string, string>>[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!lower.includes("buy") && !lower.includes("sell")) continue;

      const tokens = line.split(/\s+/);
      const sideIndex = tokens.findIndex((t) => t.toLowerCase() === "buy" || t.toLowerCase() === "sell");
      if (sideIndex === -1) continue;

      const sideRaw = tokens[sideIndex].toLowerCase();
      const side = sideRaw === "buy" ? "LONG" : "SHORT";

      const candidate: Partial<Record<string, string>> = { side };

      // Deal/Order Ticket
      if (sideIndex >= 3 && /^\d+$/.test(tokens[0].replace("#", ""))) {
        candidate.externalReference = tokens[0].replace("#", "");
      }

      // MT5 Time (Date + Time)
      if (sideIndex >= 2) {
        candidate.entryDate = `${tokens[sideIndex - 2]} ${tokens[sideIndex - 1]}`;
      } else if (sideIndex >= 1) {
        candidate.entryDate = tokens[sideIndex - 1];
      }

      // Check for MT5 Direction token ("in", "out", "inout") following buy/sell
      let offset = sideIndex + 1;
      if (offset < tokens.length && ["in", "out", "inout"].includes(tokens[offset].toLowerCase())) {
        offset++;
      }

      // Volume / Quantity
      if (offset < tokens.length && /^\d+\.?\d*$/.test(tokens[offset])) {
        candidate.quantity = tokens[offset];
        offset++;
      }

      // Symbol
      if (offset < tokens.length && /^[A-Z0-9\.\_\-]+$/i.test(tokens[offset])) {
        candidate.title = tokens[offset].toUpperCase();
        offset++;
      }

      // Price
      if (offset < tokens.length && /^\d+\.?\d*$/.test(tokens[offset])) {
        candidate.entryPrice = tokens[offset];
        offset++;
      }

      // Optional explicit keywords in MT5: "Commission: -2.50 Swap: -1.00 Profit: 150.00"
      const commMatch = line.match(/commission:?\s*(-?\d+[\.,]?\d*)/i);
      if (commMatch) candidate.commission = commMatch[1];

      const swapMatch = line.match(/swap:?\s*(-?\d+[\.,]?\d*)/i);
      if (swapMatch) candidate.swap = swapMatch[1];

      const profitMatch = line.match(/(?:profit|pnl):?\s*(-?\$?\d+[\.,]?\d*)/i);
      if (profitMatch) {
        candidate.grossPnl = profitMatch[1];
      } else if (tokens.length > offset) {
        // Fallback to last token if numbers are columnated
        const lastToken = tokens[tokens.length - 1];
        if (/^-?\$?\d+[\.,]?\d*$/.test(lastToken.replace(/[()]/g, ""))) {
          candidate.grossPnl = lastToken;
        }
      }

      candidates.push(candidate);
    }

    return candidates;
  }
}

/**
 * Dedicated TradingView Profile.
 * Supports TradingView Positions, Orders, and Paper Trading exports.
 */
export class TradingViewProfile implements TradingScreenshotProfile {
  source: PlatformSource = "TradingView";

  parse(text: string): Partial<Record<string, string>>[] {
    const lines = splitLines(text);
    const candidates: Partial<Record<string, string>>[] = [];

    let currentCandidate: Partial<Record<string, string>> | null = null;

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Check for standalone Symbol header or line
      const symbolMatch = line.match(/^[A-Z]{2,8}(?:\.[A-Z]+)?$/);
      if (symbolMatch && !currentCandidate) {
        currentCandidate = { title: symbolMatch[0] };
        continue;
      }

      // Or inline symbol with trade action e.g. "EURUSD Buy 100 @ 1.0850"
      const inlineMatch = line.match(/\b([A-Z]{3,8})\b\s+(Buy|Sell|Long|Short)\s+([\d\.]+)/i);
      if (inlineMatch) {
        if (currentCandidate) candidates.push(currentCandidate);
        currentCandidate = {
          title: inlineMatch[1].toUpperCase(),
          side: ["buy", "long"].includes(inlineMatch[2].toLowerCase()) ? "LONG" : "SHORT",
          quantity: inlineMatch[3],
        };
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

        if (lower.includes("take profit") || lower.includes("tp")) {
          const numMatch = line.match(/[\d\.]+/);
          if (numMatch) currentCandidate.takeProfit = numMatch[0];
        } else if (lower.includes("stop loss") || lower.includes("sl")) {
          const numMatch = line.match(/[\d\.]+/);
          if (numMatch) currentCandidate.stopLoss = numMatch[0];
        } else if (lower.includes("p&l") || (lower.includes("profit") && !lower.includes("take profit"))) {
          const pnlMatch = line.match(/[+-]?\$?[\d\.,]+/);
          if (pnlMatch) {
            currentCandidate.grossPnl = pnlMatch[0];
            candidates.push(currentCandidate);
            currentCandidate = null;
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

/**
 * Dedicated Generic Broker Profile.
 * Conservative fallback parser for arbitrary brokers or unknown layouts.
 * Extracts only high-confidence patterns and preserves warnings for downstream review.
 */
export class GenericProfile implements TradingScreenshotProfile {
  source: PlatformSource = "Generic Broker";

  parse(text: string): Partial<Record<string, string>>[] {
    const lines = splitLines(text);
    const candidates: Partial<Record<string, string>>[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      const hasAction =
        lower.includes("buy") || lower.includes("sell") || lower.includes("long") || lower.includes("short");

      if (hasAction && /\d/.test(line)) {
        const candidate: Partial<Record<string, string>> = {
          notes: "Extracted via conservative Generic Broker parser; manual verification recommended.",
        };

        if (lower.includes("buy") || lower.includes("long")) {
          candidate.side = "LONG";
        } else if (lower.includes("sell") || lower.includes("short")) {
          candidate.side = "SHORT";
        }

        // Ticker / Symbol detection
        const words = line.match(/\b[A-Z]{2,8}\b/g) || [];
        const symbol = words.find(
          (w) => !["BUY", "SELL", "LONG", "SHORT", "TRADE", "ORDER", "TOTAL", "PRICE"].includes(w)
        );
        if (symbol) {
          candidate.title = symbol;
        }

        // Date extraction if present
        const dateMatch = line.match(/\b(\d{4}[-./]\d{2}[-./]\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)\b/);
        if (dateMatch) {
          candidate.entryDate = dateMatch[1];
        }

        // Numbers extraction
        const lineWithoutDate = candidate.entryDate ? line.replace(candidate.entryDate, "") : line;
        const numbers = lineWithoutDate.match(/-?\$?\d+[.,]?\d*/g) || [];
        const cleanNumbers = numbers.map((n) => n.replace("$", ""));

        if (cleanNumbers.length >= 3) {
          candidate.quantity = cleanNumbers[0];
          candidate.entryPrice = cleanNumbers[1];
          candidate.grossPnl = cleanNumbers[cleanNumbers.length - 1];
        } else if (cleanNumbers.length === 2) {
          candidate.entryPrice = cleanNumbers[0];
          candidate.grossPnl = cleanNumbers[1];
        } else if (cleanNumbers.length === 1) {
          candidate.entryPrice = cleanNumbers[0];
        }

        candidates.push(candidate);
      }
    }

    return candidates;
  }
}

export const PROFILES: Record<PlatformSource, TradingScreenshotProfile> = {
  "MT4": new Mt4Profile(),
  "MT5": new Mt5Profile(),
  "TradingView": new TradingViewProfile(),
  "Generic Broker": new GenericProfile(),
};

export function parseOcrText(text: string, source: PlatformSource): Partial<Record<string, string>>[] {
  const profile = PROFILES[source] || PROFILES["Generic Broker"];
  return profile.parse(text);
}
