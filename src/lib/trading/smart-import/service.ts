import { TesseractOcrProvider } from "./ocr";
import { detectSource } from "./source-detection";
import { parseOcrText } from "./parsing";
import { normalizeRawCandidate } from "./normalization";
import { evaluateConfidence } from "./confidence";
import { SmartImportResult } from "./types";
import { NormalizedTradeCandidate } from "../import/types";
import { GeminiVisionProvider, GeminiExtractionResult } from "./gemini-vision";

const ocrProvider = new TesseractOcrProvider();
const geminiProvider = new GeminiVisionProvider();

interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_REQUESTS_PER_WINDOW = 20; // 20 screenshots per day
const rateLimitMap = new Map<string, RateLimitBucket>();

function checkVisionRateLimit(userId: string): void {
  const now = Date.now();
  const bucket = rateLimitMap.get(userId);

  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    throw new Error(
      `Rate limit exceeded for Smart Import Vision API. Maximum ${MAX_REQUESTS_PER_WINDOW} screenshots per day.`
    );
  }

  bucket.count += 1;
}

export async function processScreenshot(
  imageBuffer: Buffer,
  mimeType: string,
  tradingAccountId: string,
  userId: string
): Promise<SmartImportResult> {
  // 1. OCR Extraction (always runs for fallback and cross-check)
  const ocrResult = await ocrProvider.readText(imageBuffer, mimeType);

  // 2. Source Detection
  let sourceDetection = detectSource(ocrResult.text);

  // 3. Extraction (Gemini Vision preferred, fallback to Local Parsing)
  let rawCandidates: Partial<Record<string, string>>[] = [];
  let geminiResult: GeminiExtractionResult | null = null;

  if (geminiProvider.isConfigured()) {
    try {
      checkVisionRateLimit(userId);
      geminiResult = await geminiProvider.extractTrades(imageBuffer, mimeType, ocrResult.text);
      rawCandidates = geminiResult.trades;
      // Boost source detection if Gemini is confident
      if (geminiResult.sourceConfidence > sourceDetection.confidence) {
        sourceDetection = {
          source: geminiResult.source,
          confidence: geminiResult.sourceConfidence,
          evidence: ["Gemini Vision"],
        };
      }
    } catch (err: unknown) {
      console.warn("Gemini Vision Extraction failed, falling back to local OCR:", err);
      // Fallback to platform-specific parsing on failure
      rawCandidates = parseOcrText(ocrResult.text, sourceDetection.source);
    }
  } else {
    // Local Parsing
    rawCandidates = parseOcrText(ocrResult.text, sourceDetection.source);
  }

  // 4. Normalization and Confidence
  const candidates: NormalizedTradeCandidate[] = [];

  for (let i = 0; i < rawCandidates.length; i++) {
    const raw = rawCandidates[i];
    
    // Normalize
    const normalized = normalizeRawCandidate(raw, i);
    normalized.tradingAccountId = tradingAccountId; // assign ownership

    // Calculate confidence (passing OCR text for cross-check)
    evaluateConfidence(normalized, raw, sourceDetection.confidence, geminiResult !== null, ocrResult.text);

    candidates.push(normalized);
  }

  return {
    candidates,
    sourceDetection,
  };
}
