/**
 * Import Domain — Validation
 *
 * Reusable deterministic validation engine for import records.
 */

import { NormalizedTradeCandidate, ValidationIssue } from "./types";

export function validateCandidate(candidate: NormalizedTradeCandidate): NormalizedTradeCandidate {
  const issues: ValidationIssue[] = [];

  // Required Fields
  if (!candidate.tradingAccountId) {
    issues.push({ level: "ERROR", field: "tradingAccountId", message: "Trading account is required." });
  }

  if (!candidate.entryDate) {
    issues.push({ level: "ERROR", field: "entryDate", message: "Entry date is required." });
  }

  if (!candidate.side) {
    issues.push({ level: "ERROR", field: "side", message: "Trade side (LONG/SHORT) is required." });
  }
  
  if (!candidate.quantity) {
    issues.push({ level: "ERROR", field: "quantity", message: "Quantity is required." });
  } else if (Number(candidate.quantity) <= 0) {
    issues.push({ level: "ERROR", field: "quantity", message: "Quantity must be strictly positive." });
  }

  if (!candidate.entryPrice) {
    issues.push({ level: "ERROR", field: "entryPrice", message: "Entry price is required." });
  } else if (Number(candidate.entryPrice) < 0) {
    issues.push({ level: "ERROR", field: "entryPrice", message: "Entry price cannot be negative." });
  }

  // Consistency checks
  if (candidate.exitDate && candidate.entryDate) {
    if (candidate.exitDate < candidate.entryDate) {
      issues.push({ level: "ERROR", field: "exitDate", message: "Exit date cannot be before entry date." });
    }
  }

  if (candidate.status === "CLOSED") {
    if (!candidate.exitDate) {
      issues.push({ level: "WARNING", field: "exitDate", message: "Trade is CLOSED but missing exit date." });
    }
    if (!candidate.exitPrice) {
      issues.push({ level: "WARNING", field: "exitPrice", message: "Trade is CLOSED but missing exit price." });
    }
  } else if (candidate.status === "OPEN") {
    if (candidate.exitDate || candidate.exitPrice) {
      issues.push({ level: "WARNING", field: "status", message: "Trade is OPEN but has exit data." });
    }
  }

  // Cost and Risk validation
  if (candidate.commission && Number(candidate.commission) < 0) {
    // Some brokers might use negative for costs, others positive. We warn to ensure consistency.
    issues.push({ level: "INFO", field: "commission", message: "Commission is negative. Usually costs are stored as positive values." });
  }

  const isValid = !issues.some((i) => i.level === "ERROR");

  return {
    ...candidate,
    validationIssues: issues,
    isValid,
  };
}
