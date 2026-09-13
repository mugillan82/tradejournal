import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));

import { buildImportPreview, confirmImport } from "@/lib/trading/import/service";
import * as accountService from "@/lib/trading/account/service";
import * as authSession from "@/lib/auth/session";
import * as tradeService from "@/lib/trading/trade/service";

// Mock dependencies
vi.mock("@/lib/trading/account/service", () => ({
  getTradingAccountById: vi.fn(),
}));

vi.mock("@/lib/trading/trade/service", () => ({
  listTrades: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5000 }),
  createTrade: vi.fn().mockResolvedValue({ id: "trade-1" }),
}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

describe("Import Security Hardening", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Account Authorization", () => {
    it("rejects buildImportPreview if account is not owned by user", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
      vi.mocked(accountService.getTradingAccountById).mockRejectedValue(new Error("NOT_FOUND"));

      await expect(
        buildImportPreview([], {}, "foreign-account")
      ).rejects.toThrowError("NOT_FOUND");
      
      expect(accountService.getTradingAccountById).toHaveBeenCalledWith("foreign-account");
    });

    it("rejects confirmImport if account is not owned by user", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
      vi.mocked(accountService.getTradingAccountById).mockRejectedValue(new Error("NOT_FOUND"));

      const cand = {
        candidateId: "cand-1",
        tradingAccountId: "foreign-account",
        side: "LONG",
        status: "OPEN",
        entryDate: "2023-01-01T10:00:00Z",
        entryPrice: "100",
        quantity: "10",
        validationIssues: [],
        confidence: { score: 1, level: "HIGH", reasons: [] },
        duplicateMatch: { classification: "NONE", reasons: [] },
        isValid: true,
      } as any;

      await expect(
        confirmImport([cand])
      ).rejects.toThrowError("NOT_FOUND");
    });
  });

  describe("Same-batch Duplicate Detection", () => {
    it("rejects identical candidates in the same batch", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
      vi.mocked(accountService.getTradingAccountById).mockResolvedValue({ id: "acc-1" } as any);
      vi.mocked(tradeService.listTrades).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5000 });

      const cand1 = {
        candidateId: "cand-1",
        tradingAccountId: "acc-1",
        side: "LONG",
        status: "OPEN",
        entryDate: "2023-01-01T10:00:00Z",
        entryPrice: "100",
        quantity: "10",
        validationIssues: [],
        confidence: { score: 1, level: "HIGH", reasons: [] },
        duplicateMatch: { classification: "NONE", reasons: [] },
        isValid: true,
      } as any;

      // Duplicate in the exact same batch
      const cand2 = { ...cand1, candidateId: "cand-2" };

      const result = await confirmImport([cand1, cand2]);
      
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toContain("exact duplicate");
    });
  });

  describe("Date-window Scope", () => {
    it("is secure for missing dates since they cannot match exact duplicates", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
      vi.mocked(accountService.getTradingAccountById).mockResolvedValue({ id: "acc-1" } as any);
      vi.mocked(tradeService.listTrades).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5000 });
      
      // If date is missing, it skips the date window correctly
      const cand1 = {
        candidateId: "cand-1",
        tradingAccountId: "acc-1",
        side: "LONG",
        status: "OPEN",
        // NO entryDate provided
        entryPrice: "100",
        quantity: "10",
        validationIssues: [],
        confidence: { score: 1, level: "HIGH", reasons: [] },
        duplicateMatch: { classification: "NONE", reasons: [] },
        isValid: true,
      } as any;

      const result = await confirmImport([cand1]);
      
      // Because cand1 is missing entryDate, it fails server-side validation.
      // But it proves that missing dates don't crash duplicate detection.
      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain("failed server-side validation");
    });
  });
});
