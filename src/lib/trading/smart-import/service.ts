import { TesseractOcrProvider } from "./ocr";
import { detectSource } from "./source-detection";
import { parseOcrText } from "./parsing";
import { normalizeRawCandidate } from "./normalization";
import { evaluateConfidence } from "./confidence";
import { SmartImportResult } from "./types";
import { NormalizedTradeCandidate } from "../import/types";

const ocrProvider = new TesseractOcrProvider();

export async function processScreenshot(
  imageBuffer: Buffer,
  mimeType: string,
  tradingAccountId: string
): Promise<SmartImportResult> {
  // 1. OCR Extraction
  const ocrResult = await ocrProvider.readText(imageBuffer, mimeType);

  // 2. Source Detection
  const sourceDetection = detectSource(ocrResult.text);

  // 3. Platform-specific Parsing
  const rawCandidates = parseOcrText(ocrResult.text, sourceDetection.source);

  // 4. Normalization and Confidence
  const candidates: NormalizedTradeCandidate[] = [];

  for (let i = 0; i < rawCandidates.length; i++) {
    const raw = rawCandidates[i];
    
    // Normalize
    const normalized = normalizeRawCandidate(raw, i);
    normalized.tradingAccountId = tradingAccountId; // assign ownership

    // Calculate confidence
    evaluateConfidence(normalized, raw, sourceDetection.confidence);

    candidates.push(normalized);
  }

  // NOTE: Duplicate detection and confirmation pipeline integration
  // occurs in the route handler by passing these candidates to `buildImportPreview`.

  return {
    candidates,
    sourceDetection,
  };
}
