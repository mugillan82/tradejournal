/**
 * Import Domain — Confidence
 *
 * Deterministic confidence modeling for imported records.
 */

import { NormalizedTradeCandidate, ConfidenceScore } from "./types";

export function calculateConfidence(candidate: NormalizedTradeCandidate): ConfidenceScore {
  let score = 1.0;
  const reasons: string[] = [];

  // Deduct for validation warnings/infos
  const warnings = candidate.validationIssues.filter(i => i.level === "WARNING");
  if (warnings.length > 0) {
    score -= 0.1 * warnings.length;
    reasons.push(`${warnings.length} validation warning(s)`);
  }

  const infos = candidate.validationIssues.filter(i => i.level === "INFO");
  if (infos.length > 0) {
    score -= 0.05 * infos.length;
    reasons.push(`${infos.length} validation info(s)`);
  }

  // Check for missing optional but important fields
  if (!candidate.exitDate && candidate.status === "CLOSED") {
    score -= 0.1;
    reasons.push("Missing exit date for closed trade");
  }

  if (!candidate.exitPrice && candidate.status === "CLOSED") {
    score -= 0.1;
    reasons.push("Missing exit price for closed trade");
  }
  
  if (!candidate.title) {
    score -= 0.05;
    reasons.push("Missing symbol/title");
  }

  score = Math.max(0, Math.min(1.0, score));

  let level: "HIGH" | "MEDIUM" | "LOW" = "HIGH";
  if (score < 0.7) {
    level = "LOW";
  } else if (score < 0.9) {
    level = "MEDIUM";
  }

  if (level === "HIGH" && reasons.length === 0) {
    reasons.push("High confidence parsing");
  }

  return {
    score,
    level,
    reasons,
  };
}
