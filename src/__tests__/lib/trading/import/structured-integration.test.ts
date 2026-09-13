import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { CsvParser } from "@/lib/trading/import/csv";
import { XlsxParser } from "@/lib/trading/import/xlsx";
import { buildImportPreview, confirmImport } from "@/lib/trading/import/service";
import * as tradeService from "@/lib/trading/trade/service";
import * as authSession from "@/lib/auth/session";
import * as accountService from "@/lib/trading/account/service";
import readXlsxFile from "read-excel-file/node";
import type { TradingAccountDto } from "@/lib/trading/account/types";
import { TradeDto, CreateTradeInput } from "@/lib/trading/trade/types";

vi.mock("@/lib/trading/trade/service", () => ({
  listTrades: vi.fn(),
  createTrade: vi.fn(),
}));

vi.mock("@/lib/trading/account/service", () => ({
  getTradingAccountById: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("read-excel-file/node", () => ({
  default: vi.fn(),
}));

describe("Structured Import End-to-End Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-123");
    vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
      id: "acc-main",
      userId: "user-123",
      name: "Main Portfolio",
      currency: "USD",
    } as unknown as TradingAccountDto);

    vi.mocked(tradeService.listTrades).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 5000,
    });

    vi.mocked(tradeService.createTrade).mockImplementation(async (input: CreateTradeInput) => {
      return {
        id: `trade_${Math.random().toString(36).substr(2, 6)}`,
        userId: "user-123",
        ...input,
        grossPnl: input.grossPnl || null,
        netPnl: input.netPnl || null,
        status: input.status || "OPEN",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as TradeDto;
    });
  });

  describe("CSV -> Canonical Pipeline -> Trade Service Persistence", () => {
    it("successfully parses, maps, previews, and confirms trades from a CSV export", async () => {
      const csvContent = [
        "Ticker,Action,Lots,Open Price,Close Price,Open Time,Close Time,Net Profit",
        "AAPL,BUY,100,150.25,155.50,2024-02-10 14:30:00,2024-02-10 16:00:00,525.00",
        "TSLA,SELL,50,200.00,195.00,2024-02-11 10:00:00,2024-02-11 11:30:00,250.00",
      ].join("\n");

      // 1. Parse CSV
      const parser = new CsvParser();
      const parseResult = parser.parseCsvString(csvContent);
      expect(parseResult.records).toHaveLength(2);
      expect(parseResult.errors).toHaveLength(0);

      // 2. Build Preview with Column Mapping
      const mapping = {
        Ticker: "symbol" as const,
        Action: "side" as const,
        Lots: "quantity" as const,
        "Open Price": "entryPrice" as const,
        "Close Price": "exitPrice" as const,
        "Open Time": "entryDate" as const,
        "Close Time": "exitDate" as const,
        "Net Profit": "netPnl" as const,
      };

      const preview = await buildImportPreview(parseResult.records, mapping, "acc-main");
      expect(preview.totalRecords).toBe(2);
      expect(preview.validRecords).toBe(2);
      expect(preview.invalidRecords).toBe(0);
      expect(preview.duplicateRecords).toBe(0);

      // Verify normalized candidate domain representation
      const first = preview.candidates[0];
      expect(first.title).toBe("AAPL");
      expect(first.side).toBe("LONG");
      expect(first.quantity).toBe("100");
      expect(first.entryPrice).toBe("150.25");
      expect(first.exitPrice).toBe("155.50");
      expect(first.netPnl).toBe("525.00");
      expect(first.isValid).toBe(true);

      // 3. Confirm Import
      const confirmResult = await confirmImport(preview.candidates);
      expect(confirmResult.successful).toBe(2);
      expect(confirmResult.failed).toBe(0);
      expect(confirmResult.trades).toHaveLength(2);
      expect(tradeService.createTrade).toHaveBeenCalledTimes(2);

      // Verify parameters passed to TradeService
      const calls = vi.mocked(tradeService.createTrade).mock.calls;
      expect(calls[0][0].tradingAccountId).toBe("acc-main");
      expect(calls[0][0].title).toBe("AAPL");
      expect(calls[0][0].side).toBe("LONG");
      expect(calls[0][0].quantity).toBe("100");
    });
  });

  describe("XLSX -> Canonical Pipeline -> Trade Service Persistence", () => {
    it("successfully parses OpenXML workbook, previews, and commits valid trades", async () => {
      const mockZipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);

      vi.mocked(readXlsxFile).mockResolvedValue([
        {
          sheet: "Sheet1",
          data: [
            ["Symbol", "Side", "Quantity", "Entry Price", "Entry Date"],
            ["NVDA", "BUY", 20, 125.5, "2024-03-01T14:30:00.000Z"],
          ],
        },
      ]);

      // 1. Parse XLSX Buffer
      const parser = new XlsxParser();
      const parseResult = await parser.parseBuffer(mockZipBuffer);
      expect(parseResult.records).toHaveLength(1);
      expect(parseResult.selectedSheet).toBe("Sheet1");

      // 2. Build Preview
      const mapping = {
        Symbol: "symbol" as const,
        Side: "side" as const,
        Quantity: "quantity" as const,
        "Entry Price": "entryPrice" as const,
        "Entry Date": "entryDate" as const,
      };

      const preview = await buildImportPreview(parseResult.records, mapping, "acc-main");
      expect(preview.validRecords).toBe(1);
      expect(preview.candidates[0].title).toBe("NVDA");
      expect(preview.candidates[0].side).toBe("LONG");
      expect(preview.candidates[0].entryPrice).toBe("125.5");

      // 3. Confirm Import
      const confirmResult = await confirmImport(preview.candidates);
      expect(confirmResult.successful).toBe(1);
      expect(confirmResult.failed).toBe(0);
      expect(tradeService.createTrade).toHaveBeenCalledTimes(1);
    });
  });
});
