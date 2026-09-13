import { NormalizedTradeCandidate } from "../import/types";

/**
 * Common abstractions for OCR and Smart Import domain.
 */

export interface OcrResult {
  text: string;
  confidence: number;
}

export interface OcrProvider {
  /**
   * Initializes or prepares the OCR engine.
   */
  initialize(): Promise<void>;

  /**
   * Reads text from an image buffer.
   */
  readText(imageBuffer: Buffer, mimeType: string): Promise<OcrResult>;

  /**
   * Cleans up resources.
   */
  terminate(): Promise<void>;
}

export type PlatformSource = "MT4" | "MT5" | "TradingView" | "Generic Broker";

export interface SourceDetectionResult {
  source: PlatformSource;
  confidence: number;
  evidence: string[];
}

/**
 * Profile responsible for parsing a specific platform's text into trade candidates.
 */
export interface TradingScreenshotProfile {
  readonly source: PlatformSource;
  
  /**
   * Extract potential candidates from raw OCR text.
   * Can return partial records since it runs before canonical normalization.
   */
  parse(text: string): Partial<Record<string, string>>[];
}

export interface SmartImportResult {
  candidates: NormalizedTradeCandidate[];
  sourceDetection: SourceDetectionResult;
}
