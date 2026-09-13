import { NormalizedTradeCandidate } from "../import/types";

export function evaluateConfidence(
  candidate: NormalizedTradeCandidate,
  raw: Partial<Record<string, string>>,
  sourceConfidence: number
): void {
  let score = 1.0;
  const reasons: string[] = [];
  const validationIssues: { field?: string; level: "ERROR" | "WARNING" | "INFO"; message: string }[] = [];

  // Source penalty
  if (sourceConfidence < 0.5) {
    score -= 0.2;
    reasons.push("Low platform detection confidence");
  }

  // Field validation and confidence
  if (!candidate.title) {
    score -= 0.3;
    reasons.push("Missing symbol/title");
    validationIssues.push({ field: "title", level: "ERROR", message: "Missing symbol/title" });
  }

  if (candidate.quantity === "1" && !raw.quantity) {
    score -= 0.1;
    validationIssues.push({ field: "quantity", level: "WARNING", message: "Quantity not detected, defaulted to 1" });
  }

  if (candidate.entryPrice === "0") {
    score -= 0.3;
    validationIssues.push({ field: "entryPrice", level: "WARNING", message: "Entry price not detected, defaulted to 0" });
  }

  // Determine level
  let level: "HIGH" | "MEDIUM" | "LOW" = "HIGH";
  if (score < 0.6) level = "LOW";
  else if (score < 0.9) level = "MEDIUM";

  candidate.confidence = {
    score: Math.max(0, score),
    level,
    reasons,
  };

  candidate.validationIssues = validationIssues;
  
  // Overall validity based on strict constraints
  if (!candidate.title || candidate.entryPrice === "0" || score < 0.4) {
    candidate.isValid = false;
  }
}
