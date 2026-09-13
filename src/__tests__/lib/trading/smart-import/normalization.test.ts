import { describe, expect, it } from "vitest";
import {
  normalizeOcrDecimal,
  normalizeOcrDate,
  normalizeRawCandidate,
} from "@/lib/trading/smart-import/normalization";
import { evaluateConfidence } from "@/lib/trading/smart-import/confidence";

describe("Smart Import Normalization & Precision", () => {
  describe("normalizeOcrDecimal", () => {
    it("preserves high-precision forex and crypto decimals without floating-point error", () => {
      expect(normalizeOcrDecimal("1.08542")).toBe("1.08542");
      expect(normalizeOcrDecimal("0.00001234")).toBe("0.00001234");
      expect(normalizeOcrDecimal("65432.10")).toBe("65432.10");
    });

    it("normalizes negative P&L with parenthesized notation", () => {
      expect(normalizeOcrDecimal("(150.50)")).toBe("-150.50");
      expect(normalizeOcrDecimal("($2,340.00)")).toBe("-2340.00");
    });

    it("normalizes negative P&L and swap with standard minus signs", () => {
      expect(normalizeOcrDecimal("-50.25")).toBe("-50.25");
      expect(normalizeOcrDecimal("-$120.00")).toBe("-120.00");
      expect(normalizeOcrDecimal("-2.50")).toBe("-2.50");
    });

    it("handles thousands separators and European decimal commas", () => {
      expect(normalizeOcrDecimal("1,234.56")).toBe("1234.56");
      expect(normalizeOcrDecimal("1234,56")).toBe("1234.56");
    });

    it("rejects ambiguous OCR numeric strings with multiple decimal points or corrupt characters", () => {
      expect(normalizeOcrDecimal("1.05.50")).toBeUndefined();
      expect(normalizeOcrDecimal("12..34")).toBeUndefined();
      expect(normalizeOcrDecimal("abc123")).toBeUndefined();
      expect(normalizeOcrDecimal("")).toBeUndefined();
      expect(normalizeOcrDecimal(undefined)).toBeUndefined();
    });
  });

  describe("normalizeOcrDate", () => {
    it("converts dot-formatted dates into valid ISO dates", () => {
      const date = normalizeOcrDate("2023.10.15 14:30:00");
      expect(date).toBeDefined();
      expect(date?.getFullYear()).toBe(2023);
      expect(date?.getMonth()).toBe(9); // 0-indexed October
      expect(date?.getDate()).toBe(15);
    });

    it("returns undefined for malformed or missing dates without silent fallback", () => {
      expect(normalizeOcrDate("not-a-date")).toBeUndefined();
      expect(normalizeOcrDate("")).toBeUndefined();
      expect(normalizeOcrDate(undefined)).toBeUndefined();
    });
  });

  describe("normalizeRawCandidate & Validation Integration", () => {
    it("normalizes BUY and LONG to LONG, SELL and SHORT to SHORT", () => {
      const candBuy = normalizeRawCandidate({ side: "buy", title: "EURUSD", quantity: "1", entryPrice: "1.05" }, 0);
      expect(candBuy.side).toBe("LONG");

      const candSell = normalizeRawCandidate({ side: "sell", title: "EURUSD", quantity: "1", entryPrice: "1.05" }, 1);
      expect(candSell.side).toBe("SHORT");
    });

    it("does not silently fabricate missing quantity or entryPrice", () => {
      const cand = normalizeRawCandidate({ title: "AAPL", side: "BUY" }, 0);
      expect(cand.quantity).toBeUndefined();
      expect(cand.entryPrice).toBeUndefined();
      expect(cand.entryDate).toBeUndefined();

      evaluateConfidence(cand, {}, 0.9);
      expect(cand.isValid).toBe(false);
      expect(cand.validationIssues.some((i) => i.field === "quantity")).toBe(true);
      expect(cand.validationIssues.some((i) => i.field === "entryPrice")).toBe(true);
      expect(cand.validationIssues.some((i) => i.field === "entryDate")).toBe(true);
    });
  });
});
