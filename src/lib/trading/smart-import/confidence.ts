import { NormalizedTradeCandidate, ValidationIssue } from "../import/types";
import { validateCandidate } from "../import/validation";

export function evaluateConfidence(
  candidate: NormalizedTradeCandidate,
  raw: Partial<Record<string, string>>,
  sourceConfidence: number
): void {
  // First run canonical validation from Import Domain
  const validated = validateCandidate(candidate);
  const issues: ValidationIssue[] = [...validated.validationIssues];

  let score = 1.0;
  const reasons: string[] = [];

  // Source penalty
  if (sourceConfidence < 0.5) {
    score -= 0.25;
    reasons.push("Low platform detection confidence");
    issues.push({ level: "WARNING", message: "Low platform detection confidence; please verify extracted values." });
  }

  // Symbol check
  if (!candidate.title) {
    score -= 0.3;
    reasons.push("Missing symbol/title");
    if (!issues.some((i) => i.field === "title")) {
      issues.push({ field: "title", level: "ERROR", message: "Symbol/instrument name is missing." });
    }
  }

  // Required values check
  if (!candidate.quantity) {
    score -= 0.3;
    reasons.push("Missing quantity");
  }

  if (!candidate.entryPrice) {
    score -= 0.3;
    reasons.push("Missing entry price");
  }

  if (!candidate.entryDate) {
    score -= 0.3;
    reasons.push("Missing entry date");
  }

  if (!candidate.side) {
    score -= 0.3;
    reasons.push("Missing trade side (BUY/SELL)");
  }

  // Determine level
  const clampedScore = Math.max(0, Math.min(1.0, Number(score.toFixed(2))));
  let level: "HIGH" | "MEDIUM" | "LOW" = "HIGH";
  if (clampedScore < 0.6) level = "LOW";
  else if (clampedScore < 0.85) level = "MEDIUM";

  candidate.confidence = {
    score: clampedScore,
    level,
    reasons,
  };

  candidate.validationIssues = issues;
  candidate.isValid = !issues.some((i) => i.level === "ERROR");
}
