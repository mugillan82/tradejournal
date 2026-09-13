import { describe, it, expect } from "vitest";
import { normalizeDecimal, normalizeSide, normalizeStatus } from "@/lib/trading/import/normalization";

describe("Import Normalization", () => {
  describe("normalizeDecimal", () => {
    it("handles standard numbers", () => {
      expect(normalizeDecimal("100.50")).toBe("100.50");
      expect(normalizeDecimal("0.1")).toBe("0.1");
      expect(normalizeDecimal("-50")).toBe("-50");
    });

    it("handles currency symbols and spaces", () => {
      expect(normalizeDecimal("$ 100.50")).toBe("100.50");
      expect(normalizeDecimal("€100")).toBe("100");
      expect(normalizeDecimal("- $50")).toBe("-50");
    });

    it("handles commas as thousand separators", () => {
      expect(normalizeDecimal("1,234.56")).toBe("1234.56");
      expect(normalizeDecimal("10,000")).toBe("10000");
    });

    it("returns null for invalid inputs", () => {
      expect(normalizeDecimal("")).toBeNull();
      expect(normalizeDecimal(null)).toBeNull();
      expect(normalizeDecimal("abc")).toBeNull();
    });
  });

  describe("normalizeSide", () => {
    it("maps LONG variants", () => {
      expect(normalizeSide("LONG")).toBe("LONG");
      expect(normalizeSide("buy")).toBe("LONG");
      expect(normalizeSide(" b ")).toBe("LONG");
    });

    it("maps SHORT variants", () => {
      expect(normalizeSide("SHORT")).toBe("SHORT");
      expect(normalizeSide("Sell")).toBe("SHORT");
      expect(normalizeSide("S")).toBe("SHORT");
    });

    it("returns null for unknowns", () => {
      expect(normalizeSide("unknown")).toBeNull();
      expect(normalizeSide("")).toBeNull();
    });
  });

  describe("normalizeStatus", () => {
    it("maps OPEN variants", () => {
      expect(normalizeStatus("OPEN")).toBe("OPEN");
      expect(normalizeStatus("Active")).toBe("OPEN");
    });

    it("maps CLOSED variants", () => {
      expect(normalizeStatus("CLOSED")).toBe("CLOSED");
      expect(normalizeStatus("Filled")).toBe("CLOSED");
    });

    it("returns null for unknowns", () => {
      expect(normalizeStatus("pending")).toBeNull();
    });
  });
});
