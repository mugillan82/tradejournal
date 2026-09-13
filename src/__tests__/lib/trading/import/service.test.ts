import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));

import { buildImportPreview, confirmImport } from "@/lib/trading/import/service";
import * as tradeService from "@/lib/trading/trade/service";
import * as authSession from "@/lib/auth/session";
import * as accountService from "@/lib/trading/account/service";
import type { TradingAccountDto } from "@/lib/trading/account/types";
import { TradeDto, TradeSideValue, TradeStatusValue } from "@/lib/trading/trade/types";
import { NormalizedTradeCandidate, RawRecord } from "@/lib/trading/import/types";

// Mock dependencies
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

describe("Import Service Hardening", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("buildImportPreview", () => {
    it("fetches scoped trades for duplicate detection based on candidates date range", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
      vi.mocked(accountService.getTradingAccountById).mockResolvedValue({ id: "acc-1" } as unknown as TradingAccountDto);
      vi.mocked(tradeService.listTrades).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5000 });

      const records: RawRecord[] = [
        { index: 1, data: { entryDate: "2023-05-10T10:00:00Z" } },
        { index: 2, data: { entryDate: "2023-05-12T10:00:00Z" } },
      ];
      
      const mapping = { entryDate: "entryDate" as const };
      
      await buildImportPreview(records, mapping, "acc-1");
      
      expect(tradeService.listTrades).toHaveBeenCalledTimes(1);
      
      // Type casting safely for tests
      const calls = vi.mocked(tradeService.listTrades).mock.calls;
      const callArg = calls[0][0] as { filters?: { tradingAccountId?: string, entryDateFrom?: Date, entryDateTo?: Date } };
      expect(callArg.filters?.tradingAccountId).toBe("acc-1");
      
      // Should have 1-day buffer around min/max
      expect(callArg.filters?.entryDateFrom?.toISOString()).toBe(new Date("2023-05-09T10:00:00.000Z").toISOString());
      expect(callArg.filters?.entryDateTo?.toISOString()).toBe(new Date("2023-05-13T10:00:00.000Z").toISOString());
    });
  });

  describe("confirmImport", () => {
    it("re-runs duplicate detection and fails exact duplicates", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
      vi.mocked(accountService.getTradingAccountById).mockResolvedValue({ id: "acc-1" } as unknown as TradingAccountDto);
      
      const existingTrade: Partial<TradeDto> = {
        id: "existing-1",
        tradingAccountId: "acc-1",
        side: "LONG" as TradeSideValue,
        entryDate: new Date("2023-01-01T10:00:00Z"),
        entryPrice: "100",
        title: "AAPL"
      };

      // Mock existing trades to return a match
      vi.mocked(tradeService.listTrades).mockResolvedValue({ 
        items: [existingTrade as TradeDto], 
        total: 1, page: 1, pageSize: 5000 
      });

      const candidate: NormalizedTradeCandidate = {
        candidateId: "cand-1",
        tradingAccountId: "acc-1",
        side: "LONG" as TradeSideValue,
        status: "OPEN" as TradeStatusValue,
        entryDate: "2023-01-01T10:00:10Z" as unknown as Date, // Simulate string from JSON payload parsing
        entryPrice: "100",
        quantity: "10",
        title: "AAPL",
        validationIssues: [],
        confidence: { score: 1, level: "HIGH", reasons: [] },
        duplicateMatch: { classification: "NONE", reasons: [] },
        isValid: true,
      };

      const result = await confirmImport([candidate]);
      
      expect(result.failed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.errors[0].error).toContain("exact duplicate");
      expect(tradeService.createTrade).not.toHaveBeenCalled();
    });

    it("re-validates candidates and fails tampered ones", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
      vi.mocked(accountService.getTradingAccountById).mockResolvedValue({ id: "acc-1" } as unknown as TradingAccountDto);
      vi.mocked(tradeService.listTrades).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5000 });

      // Client tampered: isValid is true but quantity is missing
      const candidate: NormalizedTradeCandidate = {
        candidateId: "cand-1",
        tradingAccountId: "acc-1",
        side: "LONG" as TradeSideValue,
        status: "OPEN" as TradeStatusValue,
        entryDate: "2023-01-01T10:00:00Z" as unknown as Date,
        entryPrice: "100",
        quantity: undefined as unknown as string, // INVALID
        validationIssues: [],
        confidence: { score: 1, level: "HIGH", reasons: [] },
        duplicateMatch: { classification: "NONE", reasons: [] },
        isValid: true, // TAMPERED
      };

      const result = await confirmImport([candidate]);
      
      expect(result.failed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.errors[0].error).toContain("failed server-side validation");
      expect(tradeService.createTrade).not.toHaveBeenCalled();
    });

    it("processes valid batch with partial success", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
      vi.mocked(accountService.getTradingAccountById).mockResolvedValue({ id: "acc-1" } as unknown as TradingAccountDto);
      vi.mocked(tradeService.listTrades).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5000 });

      // createTrade succeeds for first, fails for second
      vi.mocked(tradeService.createTrade)
        .mockResolvedValueOnce({ id: "trade-1" } as TradeDto)
        .mockRejectedValueOnce(new Error("Database error"));

      const cand1: NormalizedTradeCandidate = {
        candidateId: "cand-1",
        tradingAccountId: "acc-1",
        side: "LONG" as TradeSideValue,
        status: "OPEN" as TradeStatusValue,
        entryDate: "2023-01-01T10:00:00Z" as unknown as Date,
        entryPrice: "100",
        quantity: "10",
        validationIssues: [],
        confidence: { score: 1, level: "HIGH", reasons: [] },
        duplicateMatch: { classification: "NONE", reasons: [] },
        isValid: true,
      };

      const cand2: NormalizedTradeCandidate = {
        ...cand1,
        candidateId: "cand-2",
        entryDate: "2023-01-02T10:00:00Z" as unknown as Date,
      };

      const result = await confirmImport([cand1, cand2]);
      
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].candidateId).toBe("cand-2");
      expect(result.errors[0].error).toBe("Database error");
      expect(tradeService.createTrade).toHaveBeenCalledTimes(2);
    });
  });
});
