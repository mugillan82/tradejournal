import { NormalizedTradeCandidate, ValidationIssue } from "../import/types";
import { validateCandidate } from "../import/validation";

export function evaluateConfidence(
  candidate: NormalizedTradeCandidate,
  raw: Partial<Record<string, string>>,
  sourceConfidence: number,
  usedGemini: boolean = false,
  ocrTextHint: string = ""
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

  // Gemini + OCR cross-check
  if (usedGemini && ocrTextHint) {
    const ocrClean = ocrTextHint.replace(/\s+/g, "").toUpperCase();
    let agreements = 0;
    let mismatches = 0;

    const checkField = (val: string | undefined | null) => {
      if (val) {
        if (ocrClean.includes(val.replace(/[, ]/g, "").toUpperCase())) {
          agreements++;
        } else {
          mismatches++;
        }
      }
    };

    checkField(candidate.entryPrice);
    checkField(candidate.exitPrice);
    checkField(candidate.quantity);
    checkField(candidate.side);
    checkField(candidate.title); // Symbol
    checkField(candidate.grossPnl);

    if (agreements > 0) {
      score = Math.min(1.0, score + (agreements * 0.05));
      reasons.push(`OCR and Gemini Vision agreement on ${agreements} field(s)`);
    }
    if (mismatches > 0) {
      score -= (mismatches * 0.1);
      reasons.push(`Gemini extraction could not be independently verified by local OCR for ${mismatches} field(s)`);
    }
  }

  // Auto-align dates if exitDate is earlier than entryDate
  if (candidate.exitDate && candidate.entryDate) {
    const exitTime = new Date(candidate.exitDate).getTime();
    const entryTime = new Date(candidate.entryDate).getTime();
    if (exitTime < entryTime) {
      candidate.entryDate = new Date(exitTime - 60000);
    }
  }

  // Filter out any date sequence errors that were safely auto-corrected
  const filteredIssues = issues.filter(
    (i) => !(i.field === "exitDate" && i.message.includes("before entry date"))
  );

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
  candidate.validationIssues = filteredIssues;
  candidate.isValid = Boolean(
    candidate.title &&
    candidate.entryPrice &&
    !filteredIssues.some((i) => i.level === "ERROR")
  );
}
