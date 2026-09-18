import { TesseractOcrProvider } from "./ocr";
import { detectSource } from "./source-detection";
import { parseOcrTextDetailed } from "./parsing";
import { normalizeRawCandidate } from "./normalization";
import { evaluateConfidence } from "./confidence";
import { SmartImportResult, NonTradeRow, PlatformSource } from "./types";
import { NormalizedTradeCandidate } from "../import/types";
import { GeminiVisionProvider, GeminiExtractionResult } from "./gemini-vision";

const ocrProvider = new TesseractOcrProvider();
const geminiProvider = new GeminiVisionProvider();

export const PIPELINE_TIMEOUT_MS =
  Number(process.env.PIPELINE_TIMEOUT_MS) || 45000;
export const AI_VISION_TIMEOUT_MS =
  Number(process.env.AI_VISION_TIMEOUT_MS) || 20000;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_REQUESTS_PER_WINDOW = 20; // 20 screenshots per day
const rateLimitMap = new Map<string, RateLimitBucket>();

function checkVisionRateLimit(userId: string): void {
  const now = Date.now();
  
  // Cleanup expired entries to prevent unbounded memory growth
  if (rateLimitMap.size > 1000) {
    for (const [key, b] of rateLimitMap.entries()) {
      if (now > b.resetAt) rateLimitMap.delete(key);
    }
  }

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

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function processScreenshot(
  imageBuffer: Buffer,
  mimeType: string,
  tradingAccountId: string,
  userId: string,
  signal?: AbortSignal
): Promise<SmartImportResult> {
  if (signal?.aborted) {
    throw new Error("CLIENT_ABORTED");
  }

  return withTimeout(
    (async () => {
      if (signal?.aborted) {
        throw new Error("CLIENT_ABORTED");
      }

      let ocrText = "";
      let sourceDetection: { source: PlatformSource | "Generic Broker"; confidence: number; evidence: string[] } = {
        source: "Generic Broker",
        confidence: 0,
        evidence: [],
      };
      let rawCandidates: Partial<Record<string, string>>[] = [];
      let nonTradeRows: NonTradeRow[] = [];
      let geminiResult: GeminiExtractionResult | null = null;

      // 1. Fast path: If Gemini Vision is available, prioritize it for fast, highly accurate extraction
      if (geminiProvider.isConfigured() && !signal?.aborted) {
        try {
          checkVisionRateLimit(userId);
          geminiResult = await withTimeout(
            geminiProvider.extractTrades(imageBuffer, mimeType),
            AI_VISION_TIMEOUT_MS,
            `Gemini Vision timed out after ${AI_VISION_TIMEOUT_MS}ms`
          );
          if (geminiResult && Array.isArray(geminiResult.trades) && geminiResult.trades.length > 0) {
            rawCandidates = geminiResult.trades;
            sourceDetection = {
              source: geminiResult.source,
              confidence: geminiResult.sourceConfidence,
              evidence: ["Gemini Vision"],
            };
          }
        } catch (err: unknown) {
          console.warn("Gemini Vision attempt omitted or failed, falling back to local OCR:", err instanceof Error ? err.message : err);
        }
      }

      // 2. Local OCR Extraction: Runs if Gemini was not configured or produced 0 trades
      if (rawCandidates.length === 0 && !signal?.aborted) {
        const ocrResult = await ocrProvider.readText(imageBuffer, mimeType, signal);
        ocrText = ocrResult.text;

        if (signal?.aborted) {
          throw new Error("CLIENT_ABORTED");
        }

        sourceDetection = detectSource(ocrText);
        const localResult = parseOcrTextDetailed(ocrText, sourceDetection.source);
        rawCandidates = localResult.trades;
        nonTradeRows = localResult.nonTradeRows;

        // 3. Fallback to Gemini Vision with OCR hint if local parsing found 0 candidates
        if (rawCandidates.length === 0 && geminiProvider.isConfigured() && !geminiResult && !signal?.aborted) {
          try {
            checkVisionRateLimit(userId);
            geminiResult = await withTimeout(
              geminiProvider.extractTrades(imageBuffer, mimeType, ocrText),
              AI_VISION_TIMEOUT_MS,
              `Gemini Vision timed out after ${AI_VISION_TIMEOUT_MS}ms`
            );
            if (geminiResult && Array.isArray(geminiResult.trades) && geminiResult.trades.length > 0) {
              rawCandidates = geminiResult.trades;
              if (geminiResult.sourceConfidence > sourceDetection.confidence) {
                sourceDetection = {
                  source: geminiResult.source,
                  confidence: geminiResult.sourceConfidence,
                  evidence: ["Gemini Vision"],
                };
              }
            }
          } catch (err: unknown) {
            console.warn("Optional Gemini Vision fallback omitted/failed:", err instanceof Error ? err.message : err);
          }
        }
      }

      // 5. Normalization, Validation, and Confidence
      const candidates: NormalizedTradeCandidate[] = [];
      let hasUncertainOrInvalidCandidates = false;

      for (let i = 0; i < rawCandidates.length; i++) {
        const raw = rawCandidates[i];

        // Normalize
        const normalized = normalizeRawCandidate(raw, i);
        normalized.tradingAccountId = tradingAccountId; // assign ownership

        // Calculate confidence (passing OCR text for cross-check)
        evaluateConfidence(normalized, raw, sourceDetection.confidence, geminiResult !== null, ocrText);

        if (!normalized.isValid || normalized.confidence.level === "LOW") {
          hasUncertainOrInvalidCandidates = true;
        }

        candidates.push(normalized);
      }

      // 6. Terminal status calculation
      const status: "SUCCESS" | "NEEDS_REVIEW" =
        candidates.length === 0 || hasUncertainOrInvalidCandidates ? "NEEDS_REVIEW" : "SUCCESS";

      return {
        status,
        candidates,
        sourceDetection,
        nonTradeRows,
      };
    })(),
    PIPELINE_TIMEOUT_MS,
    `TIMEOUT: Smart Import processing exceeded ${PIPELINE_TIMEOUT_MS}ms budget`
  );
}
