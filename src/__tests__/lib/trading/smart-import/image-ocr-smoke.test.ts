import { describe, expect, it } from "vitest";
import path from "path";
import fs from "fs/promises";
import { TesseractOcrProvider } from "@/lib/trading/smart-import/ocr";
import { detectSource } from "@/lib/trading/smart-import/source-detection";
import { parseOcrTextDetailed } from "@/lib/trading/smart-import/parsing";
import { normalizeRawCandidate } from "@/lib/trading/smart-import/normalization";
import { evaluateConfidence } from "@/lib/trading/smart-import/confidence";

describe("Full Image OCR Smoke Test (Image -> Tesseract -> Source Detection -> MT5 Parser -> Normalization -> Confidence)", () => {
  it(
    "executes the complete real OCR pipeline on an MT5 mobile image fixture",
    { timeout: 35000 },
    async () => {
      const fixturePath = path.resolve(process.cwd(), "src/__tests__/fixtures/mt5_mobile_fixture.png");
      const imageBuffer = await fs.readFile(fixturePath);
      expect(imageBuffer.length).toBeGreaterThan(1000);

      const ocrProvider = new TesseractOcrProvider();

      try {
        const start = performance.now();

        // 1. Real Tesseract OCR
        const ocrResult = await ocrProvider.readText(imageBuffer, "image/png");
        const ocrElapsed = performance.now() - start;

        expect(ocrResult.text).toBeTruthy();
        expect(ocrResult.confidence).toBeGreaterThan(50);

        // 2. Source Detection
        const sourceDetection = detectSource(ocrResult.text);
        expect(sourceDetection.source).toBe("MT5");

        // 3. Deterministic Local Parsing
        const parsed = parseOcrTextDetailed(ocrResult.text, sourceDetection.source);
        expect(parsed.trades).toHaveLength(2);

        // Non-trade rows must be classified and separated, never parsed as trades
        expect(parsed.nonTradeRows.length).toBeGreaterThanOrEqual(5);
        const nonTradeTypes = parsed.nonTradeRows.map((r) => r.type);
        expect(nonTradeTypes).toContain("Balance");
        expect(nonTradeTypes).toContain("Deposit");
        expect(nonTradeTypes).toContain("Withdrawal");
        expect(nonTradeTypes).toContain("Swap");
        expect(nonTradeTypes).toContain("Commission");

        // 4. Normalization and Confidence Evaluation
        const candidates = parsed.trades.map((raw, idx) => {
          const normalized = normalizeRawCandidate(raw, idx);
          normalized.tradingAccountId = "acc_real_image_smoke";
          evaluateConfidence(normalized, raw, sourceDetection.confidence, false, ocrResult.text);
          return normalized;
        });

        expect(candidates).toHaveLength(2);
        const [nasTrade, eurTrade] = candidates;

        expect(nasTrade.title).toBe("NAS100.X");
        expect(nasTrade.side).toBe("LONG");
        expect(nasTrade.quantity).toBe("0.09");
        expect(nasTrade.entryPrice).toBe("29201.87");
        expect(nasTrade.exitPrice).toBe("29271.19");
        expect(nasTrade.grossPnl).toBe("6.24");
        expect(nasTrade.entryDate).toBeInstanceOf(Date);
        expect(nasTrade.isValid).toBe(true);

        expect(eurTrade.title).toBe("EURUSD.X");
        expect(eurTrade.side).toBe("SHORT");
        expect(eurTrade.quantity).toBe("0.90");
        expect(eurTrade.entryPrice).toBe("1.08920");
        expect(eurTrade.exitPrice).toBe("1.08650");
        expect(eurTrade.grossPnl).toBe("-12.50");
        expect(eurTrade.entryDate).toBeInstanceOf(Date);
        expect(eurTrade.isValid).toBe(true);

        const totalElapsed = performance.now() - start;

        console.log(
          `\n[Real Image OCR Smoke Test Results]\n` +
          `- Image size: ${imageBuffer.length} bytes\n` +
          `- OCR Duration: ${ocrElapsed.toFixed(1)} ms\n` +
          `- Total Pipeline Duration: ${totalElapsed.toFixed(1)} ms\n` +
          `- OCR Confidence: ${ocrResult.confidence.toFixed(1)}%\n` +
          `- Trades Extracted: ${candidates.length}\n` +
          `- Non-trade Rows: ${parsed.nonTradeRows.length} (${nonTradeTypes.join(", ")})\n`
        );
      } finally {
        await ocrProvider.terminate();
      }
    }
  );
});
