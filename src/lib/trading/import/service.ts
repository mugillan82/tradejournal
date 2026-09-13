/**
 * Import Domain — Service
 *
 * Server-only service orchestrating the import pipeline.
 */

import "server-only";

import { 
  ImportPreview, 
  NormalizedTradeCandidate, 
  RawRecord
} from "./types";
import { ColumnMapping, CanonicalField } from "./mapping";
import { 
  normalizeDate, 
  normalizeDecimal, 
  normalizeSide, 
  normalizeStatus,
  normalizeString
} from "./normalization";
import { validateCandidate } from "./validation";
import { calculateConfidence } from "./confidence";
import { detectDuplicate } from "./duplicate";
import { TradeDto, CreateTradeInput } from "@/lib/trading/trade/types";
import { createTrade, listTrades } from "@/lib/trading/trade/service";
import { requireServerUserId } from "@/lib/auth/session";
import { createAuthRequiredError } from "@/lib/trading/trade/errors";

async function resolveUserId(): Promise<string> {
  try {
    return await requireServerUserId();
  } catch {
    throw createAuthRequiredError();
  }
}

/**
 * Normalizes a raw record using a provided mapping.
 */
export function normalizeRecord(
  record: RawRecord,
  mapping: ColumnMapping,
  tradingAccountId: string
): NormalizedTradeCandidate {
  // Extract canonical fields from raw data based on mapping
  const extract = (field: CanonicalField): string | undefined => {
    const rawCol = Object.keys(mapping).find(col => mapping[col] === field);
    if (!rawCol) return undefined;
    return record.data[rawCol];
  };

  const candidate: NormalizedTradeCandidate = {
    candidateId: `cand_${Math.random().toString(36).substr(2, 9)}_${record.index}`,
    tradingAccountId,
    externalReference: normalizeString(extract("externalReference")),
    title: normalizeString(extract("symbol")),
    side: normalizeSide(extract("side")) || undefined,
    status: normalizeStatus(extract("status")) || undefined,
    entryDate: normalizeDate(extract("entryDate")) || undefined,
    exitDate: normalizeDate(extract("exitDate")),
    entryPrice: normalizeDecimal(extract("entryPrice")) || undefined,
    exitPrice: normalizeDecimal(extract("exitPrice")),
    quantity: normalizeDecimal(extract("quantity")) || undefined,
    stopLoss: normalizeDecimal(extract("stopLoss")),
    takeProfit: normalizeDecimal(extract("takeProfit")),
    riskAmount: normalizeDecimal(extract("riskAmount")),
    grossPnl: normalizeDecimal(extract("grossPnl")),
    netPnl: normalizeDecimal(extract("netPnl")),
    commission: normalizeDecimal(extract("commission")),
    fees: normalizeDecimal(extract("fees")),
    swap: normalizeDecimal(extract("swap")),
    notes: normalizeString(extract("notes")),
    
    // Will be populated in subsequent steps
    validationIssues: [],
    confidence: { score: 0, level: "LOW", reasons: [] },
    duplicateMatch: { classification: "NONE", reasons: [] },
    isValid: false,
  };

  return candidate;
}

/**
 * Builds the preview from raw records, applying mapping, normalization, 
 * validation, duplicate detection, and confidence scoring.
 */
export async function buildImportPreview(
  records: RawRecord[],
  mapping: ColumnMapping,
  tradingAccountId: string
): Promise<ImportPreview> {
  // Authentication happens inside resolveUserId but we don't need to capture it if we only use it for side-effects
  await resolveUserId();

  // Fetch recent trades for duplicate detection (Optimization: only fetch last 6 months or fetch selectively)
  // For this foundation, we fetch up to 1000 recent trades for the account.
  const recentTradesResult = await listTrades({
    filters: { tradingAccountId },
    pagination: { page: 1, pageSize: 1000 },
    sort: { field: "entryDate", direction: "desc" }
  });
  const existingTrades = recentTradesResult.items as TradeDto[];

  let validCount = 0;
  let invalidCount = 0;
  let exactDupCount = 0;
  let possibleDupCount = 0;
  const candidates: NormalizedTradeCandidate[] = [];

  for (const record of records) {
    let candidate = normalizeRecord(record, mapping, tradingAccountId);
    
    // Validate
    candidate = validateCandidate(candidate);

    // Duplicate detection
    const duplicateMatch = detectDuplicate(candidate, existingTrades);
    candidate.duplicateMatch = duplicateMatch;

    // Confidence
    candidate.confidence = calculateConfidence(candidate);

    candidates.push(candidate);

    if (candidate.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    if (duplicateMatch.classification === "EXACT") exactDupCount++;
    if (duplicateMatch.classification === "POSSIBLE") possibleDupCount++;
  }

  return {
    totalRecords: records.length,
    validRecords: validCount,
    invalidRecords: invalidCount,
    duplicateRecords: exactDupCount,
    possibleDuplicates: possibleDupCount,
    candidates,
  };
}

export interface ConfirmImportResult {
  successful: number;
  failed: number;
  errors: { candidateId: string; error: string }[];
}

/**
 * Processes confirmed candidates by re-validating and inserting them via TradeService.
 */
export async function confirmImport(
  candidates: NormalizedTradeCandidate[]
): Promise<ConfirmImportResult> {
  // Authentication is handled inside createTrade implicitly, but we enforce it here as well
  await resolveUserId();

  let successful = 0;
  let failed = 0;
  const errors: { candidateId: string; error: string }[] = [];

  // In a robust implementation, this could use a queue or chunked transactions.
  // For now, we process sequentially using the existing TradeService to preserve all invariants.
  for (const candidate of candidates) {
    // Re-validate to ensure client didn't tamper with isValid
    const validated = validateCandidate(candidate);
    if (!validated.isValid) {
      failed++;
      errors.push({ 
        candidateId: candidate.candidateId, 
        error: "Candidate failed server-side validation." 
      });
      continue;
    }

    // Map candidate back to CreateTradeInput
    const createInput: CreateTradeInput = {
      tradingAccountId: candidate.tradingAccountId,
      side: candidate.side!,
      status: candidate.status,
      entryPrice: candidate.entryPrice!,
      entryDate: new Date(candidate.entryDate!), // convert from string/Date back to Date if JSON stringified
      exitPrice: candidate.exitPrice,
      exitDate: candidate.exitDate ? new Date(candidate.exitDate) : undefined,
      stopLoss: candidate.stopLoss,
      takeProfit: candidate.takeProfit,
      riskAmount: candidate.riskAmount,
      quantity: candidate.quantity!,
      grossPnl: candidate.grossPnl,
      netPnl: candidate.netPnl,
      commission: candidate.commission,
      fees: candidate.fees,
      swap: candidate.swap,
      title: candidate.title,
      notes: candidate.notes,
    };

    try {
      await createTrade(createInput);
      successful++;
    } catch (err) {
      failed++;
      errors.push({
        candidateId: candidate.candidateId,
        error: err instanceof Error ? err.message : "Unknown error during trade creation",
      });
    }
  }

  return { successful, failed, errors };
}
