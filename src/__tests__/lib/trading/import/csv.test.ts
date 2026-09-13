import { describe, it, expect } from "vitest";
import { CsvParser } from "@/lib/trading/import/csv";

describe("CsvParser", () => {
  const parser = new CsvParser();

  it("identifies supported file extensions and mime types", () => {
    const csvFile = new File(["test"], "trades.csv", { type: "text/csv" });
    const txtFile = new File(["test"], "trades.txt", { type: "text/plain" });
    expect(parser.canHandle(csvFile)).toBe(true);
    expect(parser.canHandle(txtFile)).toBe(false);
  });

  describe("Delimiter Detection", () => {
    it("detects comma delimiter", () => {
      const text = "Symbol,Side,Quantity,Entry Price\nEURUSD,BUY,1.0,1.0850";
      expect(parser.detectDelimiter(text)).toBe(",");
    });

    it("detects semicolon delimiter (common in European broker exports)", () => {
      const text = "Symbol;Side;Quantity;Entry Price\nEURUSD;BUY;1.0;1.0850";
      expect(parser.detectDelimiter(text)).toBe(";");
    });

    it("detects tab delimiter (TSV exports)", () => {
      const text = "Symbol\tSide\tQuantity\tEntry Price\nEURUSD\tBUY\t1.0\t1.0850";
      expect(parser.detectDelimiter(text)).toBe("\t");
    });

    it("ignores candidate delimiters inside quoted headers", () => {
      const text = '"Symbol, Ticker";"Side; Action";Quantity;Price\nEURUSD;BUY;1.0;1.0850';
      expect(parser.detectDelimiter(text)).toBe(";");
    });
  });

  describe("BOM and Special Character Handling", () => {
    it("strips UTF-8 Byte Order Mark (BOM)", () => {
      const textWithBom = "\uFEFFSymbol,Side,Quantity,Price\nEURUSD,BUY,1.0,1.0850";
      const result = parser.parseCsvString(textWithBom);
      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].data["Symbol"]).toBe("EURUSD");
      expect(Object.keys(result.records[0].data)[0]).toBe("Symbol");
    });
  });

  describe("Quotes, Escaped Quotes, and Multiline Cells", () => {
    it("handles quoted fields with commas", () => {
      const text = 'Symbol,Notes,Price\nAAPL,"Bought at support, tight stop",150.25';
      const result = parser.parseCsvString(text);
      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].data["Notes"]).toBe("Bought at support, tight stop");
      expect(result.records[0].data["Price"]).toBe("150.25");
    });

    it("handles escaped quotes inside quoted fields", () => {
      const text = 'Symbol,Comment\nTSLA,"Setup was a ""high volume breakout"""';
      const result = parser.parseCsvString(text);
      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].data["Comment"]).toBe('Setup was a "high volume breakout"');
    });

    it("handles multiline text within quotes without splitting rows", () => {
      const text = 'Symbol,Notes,Quantity\nNVDA,"First fill: 50\nSecond fill: 50",100';
      const result = parser.parseCsvString(text);
      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].data["Notes"]).toBe("First fill: 50\nSecond fill: 50");
      expect(result.records[0].data["Quantity"]).toBe("100");
    });

    it("warns when CSV contains unmatched quotes", () => {
      const text = 'Symbol,Notes\nAAPL,"Unclosed quote here';
      const result = parser.parseCsvString(text);
      expect(result.errors.some(e => e.includes("unmatched quotes"))).toBe(true);
    });
  });

  describe("Empty Rows and Malformed Rows", () => {
    it("skips completely empty or whitespace-only rows cleanly", () => {
      const text = "Symbol,Side,Quantity\n\nEURUSD,BUY,1.0\n   \nGBPUSD,SELL,2.0\n\n";
      const result = parser.parseCsvString(text);
      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(2);
      expect(result.records[0].data["Symbol"]).toBe("EURUSD");
      expect(result.records[1].data["Symbol"]).toBe("GBPUSD");
    });

    it("reports malformed rows with mismatched column count without crashing", () => {
      const text = "Symbol,Side,Quantity,Price\nEURUSD,BUY,1.0,1.0850\nMALFORMED,ROW\nGBPUSD,SELL,2.0,1.2650";
      const result = parser.parseCsvString(text);
      expect(result.errors.some(e => e.includes("Row 3 has 2 columns, expected 4"))).toBe(true);
      expect(result.records).toHaveLength(2);
      expect(result.records[0].data["Symbol"]).toBe("EURUSD");
      expect(result.records[1].data["Symbol"]).toBe("GBPUSD");
    });

    it("returns error for empty file or insufficient rows", () => {
      expect(parser.parseCsvString("").records).toHaveLength(0);
      expect(parser.parseCsvString("Symbol,Side,Quantity").records).toHaveLength(0);
      expect(parser.parseCsvString("Symbol,Side,Quantity").errors[0]).toContain("not contain enough data");
    });
  });

  describe("Header Deduplication", () => {
    it("deduplicates duplicate header column names safely", () => {
      const text = "Price,Price,Price\n100,105,110";
      const result = parser.parseCsvString(text);
      expect(result.records).toHaveLength(1);
      const keys = Object.keys(result.records[0].data);
      expect(keys).toEqual(["Price", "Price_1", "Price_2"]);
      expect(result.records[0].data["Price"]).toBe("100");
      expect(result.records[0].data["Price_1"]).toBe("105");
      expect(result.records[0].data["Price_2"]).toBe("110");
    });
  });

  describe("Row Limits", () => {
    it("enforces maxRows option to protect memory", () => {
      let csv = "Symbol,Side,Quantity\n";
      for (let i = 0; i < 100; i++) {
        csv += `SYM${i},BUY,1.0\n`;
      }
      const result = parser.parseCsvString(csv, { maxRows: 10 });
      expect(result.records).toHaveLength(10);
      expect(result.errors.some(e => e.includes("Row limit exceeded"))).toBe(true);
    });
  });
});
