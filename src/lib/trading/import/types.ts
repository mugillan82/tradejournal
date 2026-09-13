/**
 * Import Domain — Types
 *
 * Defines the canonical types for the import infrastructure.
 */

import type { TradeSideValue, TradeStatusValue, DecimalString } from "@/lib/trading/trade/types";

export type ImportSource =
  | "CSV"
  | "XLSX"
  | "PDF"
  | "SCREENSHOT"
  | "MT4"
  | "MT5"
  | "BROKER"
  | "GENERIC";

export type ImportFormat = "CSV" | "XLSX" | "PDF" | "IMAGE" | "JSON";

export type ImportStatus =
  | "CREATED"
  | "PROCESSING"
  | "PREVIEW_READY"
  | "CONFIRMING"
  | "CONFIRMED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ValidationLevel = "ERROR" | "WARNING" | "INFO";

export interface ValidationIssue {
  level: ValidationLevel;
  field?: string;
  message: string;
}

export interface ConfidenceScore {
  score: number; // 0.0 to 1.0
  level: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
}

export type DuplicateClassification = "EXACT" | "POSSIBLE" | "NONE";

export interface DuplicateMatch {
  classification: DuplicateClassification;
  existingTradeId?: string;
  reasons: string[];
}

export interface RawRecord {
  index: number;
  data: Record<string, string>;
  originalText?: string;
}

export interface NormalizedTradeCandidate {
  // We don't have ID yet, this is a candidate
  candidateId: string; // client-side or temporary id for tracking during preview
  
  // Core identifiers
  tradingAccountId: string;
  externalReference?: string;

  // Domain Fields (aligned with existing Trade model)
  side?: TradeSideValue;
  status?: TradeStatusValue;
  entryDate?: Date;
  exitDate?: Date | null;
  entryPrice?: DecimalString;
  exitPrice?: DecimalString | null;
  quantity?: DecimalString;
  stopLoss?: DecimalString | null;
  takeProfit?: DecimalString | null;
  riskAmount?: DecimalString | null;
  grossPnl?: DecimalString | null;
  netPnl?: DecimalString | null;
  commission?: DecimalString | null;
  fees?: DecimalString | null;
  swap?: DecimalString | null;
  
  title?: string;
  notes?: string;
  
  // Pipeline context
  validationIssues: ValidationIssue[];
  confidence: ConfidenceScore;
  duplicateMatch: DuplicateMatch;
  isValid: boolean; // false if any ERROR level validation issues
}

export interface ImportPreview {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number; // Exact duplicates
  possibleDuplicates: number;
  candidates: NormalizedTradeCandidate[];
}

export interface ParseResult {
  records: RawRecord[];
  errors: string[];
}

export interface ImportParser {
  canHandle(file: File): boolean;
  parse(file: File): Promise<ParseResult>;
}
