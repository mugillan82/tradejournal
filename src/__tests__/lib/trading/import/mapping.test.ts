import { describe, it, expect } from "vitest";
import {
  normalizeColumnName,
  suggestCanonicalMapping,
  detectColumnMappings,
} from "@/lib/trading/import/mapping";

describe("Column Mapping System", () => {
  describe("normalizeColumnName", () => {
    it("strips whitespace, casing, and special characters", () => {
      expect(normalizeColumnName("Entry Price ($)")).toBe("entryprice");
      expect(normalizeColumnName("Buy / Sell")).toBe("buysell");
      expect(normalizeColumnName("P&L")).toBe("pl");
      expect(normalizeColumnName("Ticket #")).toBe("ticket");
    });
  });

  describe("suggestCanonicalMapping aliases", () => {
    it("maps symbol aliases", () => {
      expect(suggestCanonicalMapping("Symbol")).toBe("symbol");
      expect(suggestCanonicalMapping("Ticker")).toBe("symbol");
      expect(suggestCanonicalMapping("Instrument")).toBe("symbol");
      expect(suggestCanonicalMapping("Pair")).toBe("symbol");
      expect(suggestCanonicalMapping("Market")).toBe("symbol");
      expect(suggestCanonicalMapping("Asset")).toBe("symbol");
    });

    it("maps side / direction aliases", () => {
      expect(suggestCanonicalMapping("Side")).toBe("side");
      expect(suggestCanonicalMapping("Direction")).toBe("side");
      expect(suggestCanonicalMapping("Action")).toBe("side");
      expect(suggestCanonicalMapping("Type")).toBe("side");
      expect(suggestCanonicalMapping("Buy/Sell")).toBe("side");
      expect(suggestCanonicalMapping("B/S")).toBe("side");
    });

    it("maps quantity aliases", () => {
      expect(suggestCanonicalMapping("Quantity")).toBe("quantity");
      expect(suggestCanonicalMapping("Qty")).toBe("quantity");
      expect(suggestCanonicalMapping("Volume")).toBe("quantity");
      expect(suggestCanonicalMapping("Size")).toBe("quantity");
      expect(suggestCanonicalMapping("Lots")).toBe("quantity");
      expect(suggestCanonicalMapping("Contracts")).toBe("quantity");
      expect(suggestCanonicalMapping("Shares")).toBe("quantity");
    });

    it("maps price aliases", () => {
      expect(suggestCanonicalMapping("Entry")).toBe("entryPrice");
      expect(suggestCanonicalMapping("Entry Price")).toBe("entryPrice");
      expect(suggestCanonicalMapping("Open Price")).toBe("entryPrice");
      expect(suggestCanonicalMapping("Open")).toBe("entryPrice");
      expect(suggestCanonicalMapping("Exit")).toBe("exitPrice");
      expect(suggestCanonicalMapping("Exit Price")).toBe("exitPrice");
      expect(suggestCanonicalMapping("Close Price")).toBe("exitPrice");
      expect(suggestCanonicalMapping("Close")).toBe("exitPrice");
    });

    it("maps date / time aliases", () => {
      expect(suggestCanonicalMapping("Entry Time")).toBe("entryDate");
      expect(suggestCanonicalMapping("Open Time")).toBe("entryDate");
      expect(suggestCanonicalMapping("Opened")).toBe("entryDate");
      expect(suggestCanonicalMapping("Entry Date")).toBe("entryDate");
      expect(suggestCanonicalMapping("Exit Time")).toBe("exitDate");
      expect(suggestCanonicalMapping("Close Time")).toBe("exitDate");
      expect(suggestCanonicalMapping("Closed")).toBe("exitDate");
      expect(suggestCanonicalMapping("Exit Date")).toBe("exitDate");
    });

    it("maps P&L and cost aliases", () => {
      expect(suggestCanonicalMapping("PnL")).toBe("netPnl");
      expect(suggestCanonicalMapping("P&L")).toBe("netPnl");
      expect(suggestCanonicalMapping("Net Profit")).toBe("netPnl");
      expect(suggestCanonicalMapping("Gross PnL")).toBe("grossPnl");
      expect(suggestCanonicalMapping("Commission")).toBe("commission");
      expect(suggestCanonicalMapping("Fee")).toBe("fees");
      expect(suggestCanonicalMapping("Fees")).toBe("fees");
      expect(suggestCanonicalMapping("Swap")).toBe("swap");
      expect(suggestCanonicalMapping("Financing")).toBe("swap");
    });

    it("maps risk aliases", () => {
      expect(suggestCanonicalMapping("Stop Loss")).toBe("stopLoss");
      expect(suggestCanonicalMapping("SL")).toBe("stopLoss");
      expect(suggestCanonicalMapping("Take Profit")).toBe("takeProfit");
      expect(suggestCanonicalMapping("TP")).toBe("takeProfit");
      expect(suggestCanonicalMapping("Risk Amount")).toBe("riskAmount");
    });

    it("maps account and identifier aliases", () => {
      expect(suggestCanonicalMapping("Account")).toBe("tradingAccountId");
      expect(suggestCanonicalMapping("Account ID")).toBe("tradingAccountId");
      expect(suggestCanonicalMapping("Ticket")).toBe("externalReference");
      expect(suggestCanonicalMapping("Order ID")).toBe("externalReference");
      expect(suggestCanonicalMapping("Trade ID")).toBe("externalReference");
    });

    it("returns null when confidence is low or unknown", () => {
      expect(suggestCanonicalMapping("Random Column")).toBeNull();
      expect(suggestCanonicalMapping("Custom Header XYZ")).toBeNull();
      expect(suggestCanonicalMapping("")).toBeNull();
    });
  });

  describe("detectColumnMappings", () => {
    it("auto-detects mapped columns and identifies unmapped and missing required fields", () => {
      const headers = [
        "Symbol",
        "Type",
        "Volume",
        "Open Price",
        "Open Time",
        "Custom Notes",
      ];

      const result = detectColumnMappings(headers);
      expect(result.mapping["Symbol"]).toBe("symbol");
      expect(result.mapping["Type"]).toBe("side");
      expect(result.mapping["Volume"]).toBe("quantity");
      expect(result.mapping["Open Price"]).toBe("entryPrice");
      expect(result.mapping["Open Time"]).toBe("entryDate");
      expect(result.mapping["Custom Notes"]).toBeNull();

      expect(result.unmappedColumns).toEqual(["Custom Notes"]);
      expect(result.missingRequiredFields).toEqual([]);
    });

    it("flags missing required fields if source headers lack them", () => {
      const incompleteHeaders = ["Symbol", "Open Price"];
      const result = detectColumnMappings(incompleteHeaders);

      expect(result.missingRequiredFields).toContain("side");
      expect(result.missingRequiredFields).toContain("quantity");
      expect(result.missingRequiredFields).toContain("entryDate");
    });

    it("prevents assigning the same canonical field to multiple columns", () => {
      const headers = ["Price", "Entry Price", "Open Price"];
      const result = detectColumnMappings(headers);

      // Only the first matching header should map to entryPrice
      const mappedCount = Object.values(result.mapping).filter((f) => f === "entryPrice").length;
      expect(mappedCount).toBe(1);
      expect(result.unmappedColumns.length).toBeGreaterThan(0);
    });
  });
});
