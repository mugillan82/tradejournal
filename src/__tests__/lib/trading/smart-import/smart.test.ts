import { describe, expect, it } from "vitest";
import { detectSource } from "@/lib/trading/smart-import/source-detection";
import { parseOcrText } from "@/lib/trading/smart-import/parsing";
import { normalizeRawCandidate } from "@/lib/trading/smart-import/normalization";
import { evaluateConfidence } from "@/lib/trading/smart-import/confidence";
import { NormalizedTradeCandidate } from "@/lib/trading/import/types";

describe("Smart Import Domain", () => {
  describe("Source Detection", () => {
    it("detects MT4 from ticket keywords", () => {
      const res = detectSource("Ticket 12345 S/L 1.2 T/P 1.5");
      expect(["MT4", "MT5"]).toContain(res.source);
      expect(res.confidence).toBeGreaterThan(0.5);
    });

    it("detects TradingView from branding and headers", () => {
      const res = detectSource("Paper Trading QTY Avg Fill P&L");
      expect(res.source).toBe("TradingView");
      expect(res.confidence).toBeGreaterThan(0.8);
    });

    it("falls back to Generic Broker for unknown format", () => {
      const res = detectSource("Just some random text without keywords");
      expect(res.source).toBe("Generic Broker");
      expect(res.confidence).toBeLessThan(0.5);
    });
  });

  describe("Parsing & Normalization", () => {
    it("parses and normalizes a simple TradingView-like generic row", () => {
      const text = "AAPL LONG 10 150.50 500.00";
      // Manually routing to generic for testing
      const parsed = parseOcrText(text, "Generic Broker");
      expect(parsed).toHaveLength(1);
      
      const normalized = normalizeRawCandidate(parsed[0], 0);
      expect(normalized.title).toBe("AAPL");
      expect(normalized.side).toBe("LONG");
      expect(normalized.quantity).toBe("10");
      expect(normalized.entryPrice).toBe("150.50");
      expect(normalized.grossPnl).toBe("500.00");
    });

    it("cleans symbols during normalization", () => {
      const raw = { title: " TSLA! ", side: "BUY", entryPrice: "200" };
      const normalized = normalizeRawCandidate(raw, 0);
      expect(normalized.title).toBe("TSLA");
    });
  });

  describe("Confidence & Validation", () => {
    it("assigns high confidence to a well-formed candidate", () => {
      const candidate = normalizeRawCandidate({
        title: "EURUSD",
        side: "SELL",
        entryPrice: "1.05",
        quantity: "1",
      }, 0);
      
      evaluateConfidence(candidate, { quantity: "1" }, 0.9);
      
      expect(candidate.isValid).toBe(true);
      expect(candidate.confidence.level).toBe("HIGH");
      expect(candidate.validationIssues).toHaveLength(0);
    });

    it("flags missing title as invalid", () => {
      const candidate = normalizeRawCandidate({
        side: "SELL",
        entryPrice: "1.05",
        quantity: "1",
      }, 0);
      
      evaluateConfidence(candidate, { quantity: "1" }, 0.9);
      
      expect(candidate.isValid).toBe(false);
      expect(candidate.validationIssues.some(i => i.field === "title")).toBe(true);
    });
  });
});
