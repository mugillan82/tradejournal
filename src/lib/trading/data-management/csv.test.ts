import { describe, it, expect } from "vitest";
import { escapeCsvField, formatCsvRow, generateCsv } from "./csv";

describe("CSV Utilities", () => {
  describe("escapeCsvField", () => {
    it("handles null and undefined", () => {
      expect(escapeCsvField(null)).toBe("");
      expect(escapeCsvField(undefined)).toBe("");
    });

    it("handles plain strings and numbers", () => {
      expect(escapeCsvField("AAPL")).toBe("AAPL");
      expect(escapeCsvField(123.45)).toBe("123.45");
      expect(escapeCsvField("123.45000000")).toBe("123.45000000");
    });

    it("escapes fields containing commas", () => {
      expect(escapeCsvField("Strategy A, Strategy B")).toBe('"Strategy A, Strategy B"');
    });

    it("escapes fields containing quotes", () => {
      expect(escapeCsvField('Note with "quotes" inside')).toBe('"Note with ""quotes"" inside"');
    });

    it("escapes fields containing newlines", () => {
      expect(escapeCsvField("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });

    it("formats dates as ISO strings", () => {
      const d = new Date("2026-01-15T12:00:00.000Z");
      expect(escapeCsvField(d)).toBe("2026-01-15T12:00:00.000Z");
    });
  });

  describe("formatCsvRow", () => {
    it("formats an array of fields", () => {
      expect(formatCsvRow(["ID1", "AAPL", 150.25, "Long, scalp"])).toBe('ID1,AAPL,150.25,"Long, scalp"');
    });
  });

  describe("generateCsv", () => {
    it("generates full CSV document with CRLF", () => {
      const headers = ["ID", "Symbol", "Net PnL"];
      const rows = [
        ["1", "AAPL", "150.00"],
        ["2", "TSLA", "-50.50"],
      ];

      const csv = generateCsv(headers, rows);
      expect(csv).toBe("ID,Symbol,Net PnL\r\n1,AAPL,150.00\r\n2,TSLA,-50.50");
    });
  });
});
