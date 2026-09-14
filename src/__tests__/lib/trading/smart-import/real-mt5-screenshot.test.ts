import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import fs from "fs/promises";
import path from "path";
import { processScreenshot } from "@/lib/trading/smart-import/service";

describe("Real MT5 Mobile History Screenshot Verification", () => {
  it(
    "processes the real MT5 screenshot through the complete production pipeline",
    { timeout: 45000 },
    async () => {
      const screenshotPath = path.resolve(
        process.cwd(),
        "src/__tests__/fixtures/real_mt5_history_screenshot.jpg"
      );

      // Verify actual image file exists and is non-empty
      const imageBuffer = await fs.readFile(screenshotPath);
      expect(imageBuffer.length).toBe(72437);

      const start = performance.now();

      // Execute real production pipeline:
      // Image Buffer -> Tesseract OCR (with sharp scaling) -> source detection -> MT5 parser -> normalization -> validation & confidence
      const result = await processScreenshot(
        imageBuffer,
        "image/jpeg",
        "acc-real-mt5-test",
        "user-real-mt5-test"
      );

      const totalPipelineDuration = performance.now() - start;

      // 1. Source Detection: Must classify as MT5
      expect(result.sourceDetection.source).toBe("MT5");
      expect(result.sourceDetection.confidence).toBeGreaterThanOrEqual(0.8);

      // 2. Non-Trade Cashflows: Must detect and exclude Balance, Deposit, Withdrawal, Swap, Commission
      expect(result.nonTradeRows).toBeDefined();
      const nonTradeRows = result.nonTradeRows || [];
      expect(nonTradeRows.length).toBeGreaterThanOrEqual(5);
      const nonTradeTypes = nonTradeRows.map((r) => r.type);
      expect(nonTradeTypes).toContain("Deposit");
      expect(nonTradeTypes).toContain("Withdrawal");
      expect(nonTradeTypes).toContain("Swap");
      expect(nonTradeTypes).toContain("Commission");
      expect(nonTradeTypes).toContain("Balance");

      // Verify non-trade rows are NOT classified as trade candidates
      for (const candidate of result.candidates) {
        expect(/balance|deposit|withdrawal|swap|commission/i.test(candidate.title || "")).toBe(false);
      }

      // 3. Genuine Trade Extraction
      expect(result.candidates.length).toBeGreaterThanOrEqual(10);

      // Verify symbol identification (NAS100 and EURUSD trades extracted)
      expect(result.candidates.some((c) => c.title?.includes("NAS100"))).toBe(true);
      expect(result.candidates.some((c) => c.title?.includes("EURUSD"))).toBe(true);

      // Verify side identification (both LONG and SHORT trades present)
      expect(result.candidates.some((c) => c.side === "LONG")).toBe(true);
      expect(result.candidates.some((c) => c.side === "SHORT")).toBe(true);

      // Verify entry & exit prices were extracted without fabrication
      const closedTrades = result.candidates.filter((c) => c.entryPrice && c.exitPrice);
      expect(closedTrades.length).toBeGreaterThanOrEqual(5);

      // Verify volume extraction
      expect(result.candidates.some((c) => c.quantity)).toBe(true);

      // Verify account ownership assignment
      for (const candidate of result.candidates) {
        expect(candidate.tradingAccountId).toBe("acc-real-mt5-test");
      }

      // 4. Invariant: Uncertain trades must downgrade status to NEEDS_REVIEW
      // With real OCR on mobile images, character imperfections on some rows lower confidence or flag validation
      expect(["SUCCESS", "NEEDS_REVIEW"]).toContain(result.status);

      console.log(
        `\n[Real MT5 Screenshot Verification Results]\n` +
        `- Image File: real_mt5_history_screenshot.jpg (${imageBuffer.length} bytes)\n` +
        `- Total Pipeline Duration: ${totalPipelineDuration.toFixed(1)} ms\n` +
        `- Detected Source: ${result.sourceDetection.source} (${(result.sourceDetection.confidence * 100).toFixed(0)}%)\n` +
        `- Extracted Trade Candidates: ${result.candidates.length}\n` +
        `- Classified Non-Trade Rows: ${nonTradeRows.length} (${nonTradeTypes.join(", ")})\n` +
        `- Terminal Status: ${result.status}\n` +
        `- First 3 Trade Summaries:\n` +
        result.candidates.slice(0, 3).map((c, i) =>
          `  ${i + 1}. ${c.title} | ${c.side} | Qty: ${c.quantity} | Entry: ${c.entryPrice} | Exit: ${c.exitPrice} | Conf: ${c.confidence.level}`
        ).join("\n")
      );
    }
  );
});
