/**
 * Import Domain — Duplicate Detection
 *
 * User-scoped, account-aware deterministic duplicate detection.
 */

import { NormalizedTradeCandidate, DuplicateMatch } from "./types";
import { TradeDto } from "@/lib/trading/trade/types";

// This would typically be done via a query in a real database environment for performance,
// but for the stateless architecture where we pass candidates, we assume we fetch the existing
// trades for the same account within a time range, and pass them here to check against candidates.

export function detectDuplicate(
  candidate: NormalizedTradeCandidate,
  existingTrades: TradeDto[],
  sameBatchCandidates: NormalizedTradeCandidate[] = []
): DuplicateMatch {
  if (!candidate.isValid) {
    return { classification: "NONE", reasons: ["Candidate is invalid, skipping duplicate check"] };
  }

  for (const existing of existingTrades) {
    // Only compare against same account
    if (existing.tradingAccountId !== candidate.tradingAccountId) {
      continue;
    }

    // Exact Match Strategy
    // For many brokers, an external Reference ID is provided
    if (candidate.externalReference && existing.title && existing.title.includes(candidate.externalReference)) {
      // Very loose heuristic for external ref, typically we might have an actual field.
      // Assuming no formal externalReference field yet in TradeDto (only title), 
      // but if we did, we'd check it directly.
    }

    // Date + Symbol + Side + Price fingerprint
    let dateMatches = false;
    if (candidate.entryDate && existing.entryDate) {
      const diffTime = Math.abs(candidate.entryDate.getTime() - existing.entryDate.getTime());
      // If within 1 minute, consider it a date match
      dateMatches = diffTime < 60000;
    }

    const symbolMatches = !candidate.title || !existing.title || candidate.title.toLowerCase() === existing.title.toLowerCase();
    const sideMatches = candidate.side === existing.side;
    
    let priceMatches = false;
    if (candidate.entryPrice && existing.entryPrice) {
       // Exact string equality for DecimalString
       priceMatches = candidate.entryPrice === existing.entryPrice;
    }

    if (dateMatches && symbolMatches && sideMatches && priceMatches) {
      return {
        classification: "EXACT",
        existingTradeId: existing.id,
        reasons: ["Exact match on entry date, symbol, side, and entry price."],
      };
    }

    // Possible Match Strategy
    // Same day, same symbol, same side, but maybe average price differs slightly
    if (candidate.entryDate && existing.entryDate) {
      const isSameDay = 
        candidate.entryDate.getUTCFullYear() === existing.entryDate.getUTCFullYear() &&
        candidate.entryDate.getUTCMonth() === existing.entryDate.getUTCMonth() &&
        candidate.entryDate.getUTCDate() === existing.entryDate.getUTCDate();
      
      if (isSameDay && symbolMatches && sideMatches) {
        return {
          classification: "POSSIBLE",
          existingTradeId: existing.id,
          reasons: ["Possible match: same day, symbol, and side, but price/exact time differs."],
        };
      }
    }
  }

  // Check against same batch candidates
  for (const existingCand of sameBatchCandidates) {
    if (existingCand.tradingAccountId !== candidate.tradingAccountId) continue;

    let dateMatches = false;
    if (candidate.entryDate && existingCand.entryDate) {
      const diffTime = Math.abs(candidate.entryDate.getTime() - existingCand.entryDate.getTime());
      dateMatches = diffTime < 60000;
    }

    const symbolMatches = !candidate.title || !existingCand.title || candidate.title.toLowerCase() === existingCand.title.toLowerCase();
    const sideMatches = candidate.side === existingCand.side;
    
    let priceMatches = false;
    if (candidate.entryPrice && existingCand.entryPrice) {
       priceMatches = candidate.entryPrice === existingCand.entryPrice;
    }

    if (dateMatches && symbolMatches && sideMatches && priceMatches) {
      return {
        classification: "EXACT",
        existingTradeId: existingCand.candidateId,
        reasons: ["Exact match with another candidate in the same import batch."],
      };
    }
  }

  return {
    classification: "NONE",
    reasons: [],
  };
}
