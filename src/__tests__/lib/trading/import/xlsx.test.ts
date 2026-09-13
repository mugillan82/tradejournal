import { describe, it, expect, vi, beforeEach } from "vitest";
import { XlsxParser } from "@/lib/trading/import/xlsx";
import readXlsxFile from "read-excel-file/node";

vi.mock("read-excel-file/node", () => ({
  default: vi.fn(),
}));

describe("XlsxParser", () => {
  const parser = new XlsxParser();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("canHandle", () => {
    it("accepts .xlsx files and correct mime type", () => {
      const xlsxFile = new File(["test"], "trades.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const csvFile = new File(["test"], "trades.csv", { type: "text/csv" });
      expect(parser.canHandle(xlsxFile)).toBe(true);
      expect(parser.canHandle(csvFile)).toBe(false);
    });
  });

  describe("Magic Bytes Verification", () => {
    it("recognizes standard ZIP / OpenXML header (PK\\x03\\x04)", () => {
      const validZipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
      expect(XlsxParser.verifyZipMagicBytes(validZipBuffer)).toBe(true);
    });

    it("rejects non-zip files (EXE, ELF, Plain text, HTML)", () => {
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ header
      const textBuffer = Buffer.from("Symbol,Side,Price");
      const shortBuffer = Buffer.from([0x50, 0x4b]);

      expect(XlsxParser.verifyZipMagicBytes(exeBuffer)).toBe(false);
      expect(XlsxParser.verifyZipMagicBytes(textBuffer)).toBe(false);
      expect(XlsxParser.verifyZipMagicBytes(shortBuffer)).toBe(false);
    });

    it("throws invalid file type error when buffer is not valid ZIP", async () => {
      const fakeExeBuffer = Buffer.from([0x4d, 0x5a, 0x00, 0x00]);
      await expect(parser.parseBuffer(fakeExeBuffer)).rejects.toThrow("Invalid file type");
    });
  });

  describe("Sheet Detection and Selection", () => {
    const validBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02]);

    it("inspects available sheet names", async () => {
      vi.mocked(readXlsxFile).mockResolvedValue([
        { sheet: "Orders", data: [] },
        { sheet: "History", data: [] },
      ]);

      const sheets = await parser.getSheetNames(validBuffer);
      expect(sheets).toEqual(["Orders", "History"]);
    });

    it("selects default first sheet if no sheetName option provided", async () => {
      vi.mocked(readXlsxFile).mockResolvedValue([
        {
          sheet: "Positions",
          data: [
            ["Symbol", "Side", "Qty", "Price"],
            ["AAPL", "BUY", 100, 150.5],
          ],
        },
        {
          sheet: "Closed",
          data: [
            ["Symbol", "Side", "Qty", "Price"],
            ["MSFT", "BUY", 50, 300.0],
          ],
        },
      ]);

      const result = await parser.parseBuffer(validBuffer);
      expect(result.selectedSheet).toBe("Positions");
      expect(result.availableSheets).toEqual(["Positions", "Closed"]);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].data["Symbol"]).toBe("AAPL");
    });

    it("selects specified sheet when sheetName option is provided", async () => {
      vi.mocked(readXlsxFile).mockResolvedValue([
        {
          sheet: "Summary",
          data: [["Total", "P&L"]],
        },
        {
          sheet: "ClosedTrades",
          data: [
            ["Symbol", "Side", "Qty", "Price"],
            ["NVDA", "SHORT", 20, 120.0],
          ],
        },
      ]);

      const result = await parser.parseBuffer(validBuffer, { sheetName: "ClosedTrades" });
      expect(result.selectedSheet).toBe("ClosedTrades");
      expect(result.records).toHaveLength(1);
      expect(result.records[0].data["Symbol"]).toBe("NVDA");
      expect(result.records[0].data["Side"]).toBe("SHORT");
    });
  });

  describe("Cell Value and Financial Precision", () => {
    const validBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);

    it("preserves exact numeric decimals and formats Date instances as ISO strings", async () => {
      const mockDate = new Date("2024-03-15T14:30:00.000Z");
      vi.mocked(readXlsxFile).mockResolvedValue([
        {
          sheet: "Trades",
          data: [
            ["Symbol", "Entry Price", "Quantity", "Entry Date", "P&L"],
            ["EURUSD", 1.08523, 100000, mockDate, 452.12],
          ],
        },
      ]);

      const result = await parser.parseBuffer(validBuffer);
      expect(result.records).toHaveLength(1);
      const data = result.records[0].data;
      expect(data["Symbol"]).toBe("EURUSD");
      expect(data["Entry Price"]).toBe("1.08523");
      expect(data["Quantity"]).toBe("100000");
      expect(data["Entry Date"]).toBe(mockDate.toISOString());
      expect(data["P&L"]).toBe("452.12");
    });

    it("handles empty rows and null/undefined cells gracefully", async () => {
      vi.mocked(readXlsxFile).mockResolvedValue([
        {
          sheet: "Sheet1",
          data: [
            ["Symbol", "Notes", "Price"],
            [null, null, null], // empty row
            ["TSLA", null, 200],
            ["", "   ", ""], // whitespace row
            ["AMZN", "Earning play", 180.5],
          ],
        },
      ]);

      const result = await parser.parseBuffer(validBuffer);
      expect(result.records).toHaveLength(2);
      expect(result.records[0].data["Symbol"]).toBe("TSLA");
      expect(result.records[0].data["Notes"]).toBe("");
      expect(result.records[1].data["Symbol"]).toBe("AMZN");
      expect(result.records[1].data["Notes"]).toBe("Earning play");
    });
  });

  describe("Security and Macro Prevention", () => {
    const validBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);

    it("safely reads workbook without executing any code or embedded formulas", async () => {
      vi.mocked(readXlsxFile).mockResolvedValue([
        {
          sheet: "Sheet1",
          data: [
            ["Symbol", "Formula"],
            ["TEST", "=cmd|'/c calc'!A0"], // DDE injection attempt
          ],
        },
      ]);

      const result = await parser.parseBuffer(validBuffer);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].data["Formula"]).toBe("=cmd|'/c calc'!A0");
    });
  });
});
