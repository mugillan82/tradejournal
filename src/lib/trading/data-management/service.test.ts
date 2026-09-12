import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getDataManagementOverview,
  exportTrades,
  exportAccounts,
  exportJournal,
  exportFullBackup,
  exportData,
} from "./service";
import { prisma } from "@/lib/db/client";
import { requireServerUserId } from "@/lib/auth/session";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tradingAccount: { count: vi.fn(), findMany: vi.fn() },
    trade: { count: vi.fn(), findMany: vi.fn() },
    execution: { count: vi.fn() },
    journalEntry: { count: vi.fn(), findMany: vi.fn() },
    tradeNote: { count: vi.fn() },
    review: { count: vi.fn(), findMany: vi.fn() },
    tag: { count: vi.fn(), findMany: vi.fn() },
    strategy: { count: vi.fn(), findMany: vi.fn() },
    setup: { count: vi.fn(), findMany: vi.fn() },
    mistake: { count: vi.fn(), findMany: vi.fn() },
    attachment: { count: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

describe("Data Management Service", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireServerUserId).mockResolvedValue(mockUserId);
  });

  describe("getDataManagementOverview", () => {
    it("returns user-scoped counts across all entities", async () => {
      vi.mocked(prisma.tradingAccount.count).mockResolvedValue(2);
      vi.mocked(prisma.trade.count).mockResolvedValue(15);
      vi.mocked(prisma.execution.count).mockResolvedValue(30);
      vi.mocked(prisma.journalEntry.count).mockResolvedValue(5);
      vi.mocked(prisma.tradeNote.count).mockResolvedValue(10);
      vi.mocked(prisma.review.count).mockResolvedValue(3);
      vi.mocked(prisma.tag.count).mockResolvedValue(8);
      vi.mocked(prisma.strategy.count).mockResolvedValue(4);
      vi.mocked(prisma.setup.count).mockResolvedValue(6);
      vi.mocked(prisma.mistake.count).mockResolvedValue(2);
      vi.mocked(prisma.attachment.count).mockResolvedValue(7);

      const overview = await getDataManagementOverview();

      expect(overview).toEqual({
        accounts: 2,
        trades: 15,
        executions: 30,
        journalEntries: 5,
        tradeNotes: 10,
        reviews: 3,
        tags: 8,
        strategies: 4,
        setups: 6,
        mistakes: 2,
        attachments: 7,
      });

      expect(prisma.tradingAccount.count).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(prisma.trade.count).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(prisma.execution.count).toHaveBeenCalledWith({ where: { trade: { userId: mockUserId } } });
      expect(prisma.journalEntry.count).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(prisma.tradeNote.count).toHaveBeenCalledWith({ where: { trade: { userId: mockUserId } } });
      expect(prisma.review.count).toHaveBeenCalledWith({ where: { userId: mockUserId } });
    });
  });

  describe("exportTrades", () => {
    it("exports trades as CSV preserving decimal precision and account currency", async () => {
      const mockTrades = [
        {
          id: "trade-1",
          tradingAccountId: "acc-1",
          tradingAccount: { id: "acc-1", name: "Apex 50k", currency: "USD" },
          title: "NQ Breakout",
          side: "LONG",
          status: "CLOSED",
          entryDate: new Date("2026-02-01T14:30:00.000Z"),
          exitDate: new Date("2026-02-01T15:00:00.000Z"),
          quantity: { toString: () => "2.00000000" },
          entryPrice: { toString: () => "18500.25000000" },
          exitPrice: { toString: () => "18550.50000000" },
          stopLoss: { toString: () => "18480.00000000" },
          takeProfit: { toString: () => "18600.00000000" },
          riskAmount: { toString: () => "40.50" },
          plannedRiskReward: { toString: () => "2.50" },
          actualRMultiple: { toString: () => "2.48" },
          grossPnl: { toString: () => "100.50" },
          netPnl: { toString: () => "96.50" },
          commission: { toString: () => "4.00" },
          fees: { toString: () => "0.00" },
          swap: null,
          strategy: { id: "strat-1", name: "ORB" },
          setup: { id: "setup-1", name: "5m Opening Range" },
          tags: [{ tag: { id: "t1", name: "Momentum" } }],
          mistakes: [{ mistake: { id: "m1", name: "Late Entry" } }],
          notes: "Good execution, held to target",
          createdAt: new Date("2026-02-01T14:30:00.000Z"),
          updatedAt: new Date("2026-02-01T15:00:00.000Z"),
        },
      ];

      vi.mocked(prisma.trade.findMany).mockResolvedValue(
        mockTrades as unknown as Awaited<ReturnType<typeof prisma.trade.findMany>>
      );

      const result = await exportTrades({ dataset: "trades", format: "csv" });

      expect(result.mimeType).toBe("text/csv; charset=utf-8");
      expect(result.dataset).toBe("trades");
      expect(result.format).toBe("csv");
      expect(result.recordCount).toBe(1);
      expect(result.filename).toMatch(/^tradejournal-trades-.*\.csv$/);
      expect(result.data).toContain("trade-1");
      expect(result.data).toContain("Apex 50k");
      expect(result.data).toContain("USD");
      expect(result.data).toContain("18500.25000000");
      expect(result.data).toContain("96.50");
      expect(result.data).toContain("ORB");
      expect(result.data).toContain("5m Opening Range");
      expect(result.data).toContain("Momentum");
      expect(result.data).toContain("Late Entry");
    });

    it("exports trades as JSON", async () => {
      const mockTrades = [
        {
          id: "trade-1",
          tradingAccountId: "acc-1",
          tradingAccount: { id: "acc-1", name: "Apex 50k", currency: "USD" },
          title: "ES Trend",
          side: "LONG",
          status: "CLOSED",
          entryDate: new Date("2026-02-01T14:30:00.000Z"),
          exitDate: null,
          quantity: { toString: () => "1.00000000" },
          entryPrice: { toString: () => "5000.00000000" },
          exitPrice: null,
          stopLoss: null,
          takeProfit: null,
          riskAmount: null,
          plannedRiskReward: null,
          actualRMultiple: null,
          grossPnl: null,
          netPnl: null,
          commission: null,
          fees: null,
          swap: null,
          strategy: null,
          setup: null,
          tags: [],
          mistakes: [],
          notes: null,
          createdAt: new Date("2026-02-01T14:30:00.000Z"),
          updatedAt: new Date("2026-02-01T15:00:00.000Z"),
        },
      ];

      vi.mocked(prisma.trade.findMany).mockResolvedValue(
        mockTrades as unknown as Awaited<ReturnType<typeof prisma.trade.findMany>>
      );

      const result = await exportTrades({ dataset: "trades", format: "json" });

      expect(result.mimeType).toBe("application/json");
      expect(result.format).toBe("json");
      const parsed = JSON.parse(result.data);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe("trade-1");
      expect(parsed[0].accountCurrency).toBe("USD");
      expect(parsed[0].entryPrice).toBe("5000.00000000");
    });
  });

  describe("exportAccounts", () => {
    it("exports accounts as CSV", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          name: "Live IBKR",
          type: "LIVE",
          currency: "EUR",
          initialBalance: { toString: () => "25000.00" },
          currentBalance: { toString: () => "26450.75" },
          isActive: true,
          _count: { trades: 42 },
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-02-01T00:00:00.000Z"),
        },
      ];

      vi.mocked(prisma.tradingAccount.findMany).mockResolvedValue(
        mockAccounts as unknown as Awaited<ReturnType<typeof prisma.tradingAccount.findMany>>
      );

      const result = await exportAccounts({ dataset: "accounts", format: "csv" });

      expect(result.mimeType).toBe("text/csv; charset=utf-8");
      expect(result.recordCount).toBe(1);
      expect(result.data).toContain("Live IBKR");
      expect(result.data).toContain("EUR");
      expect(result.data).toContain("25000.00");
      expect(result.data).toContain("26450.75");
      expect(result.data).toContain("42");
    });
  });

  describe("exportJournal", () => {
    it("exports journal entries as CSV", async () => {
      const mockEntries = [
        {
          id: "journal-1",
          entryDate: new Date("2026-02-01T00:00:00.000Z"),
          mood: "VERY_GOOD",
          energy: 4,
          focus: 5,
          notes: "Felt calm and disciplined.",
          attachments: [{ id: "att-1", fileName: "chart.png", mimeType: "image/png", fileSize: 1024 }],
          createdAt: new Date("2026-02-01T10:00:00.000Z"),
          updatedAt: new Date("2026-02-01T10:00:00.000Z"),
        },
      ];

      vi.mocked(prisma.journalEntry.findMany).mockResolvedValue(
        mockEntries as unknown as Awaited<ReturnType<typeof prisma.journalEntry.findMany>>
      );

      const result = await exportJournal({ dataset: "journal", format: "csv" });

      expect(result.recordCount).toBe(1);
      expect(result.data).toContain("journal-1");
      expect(result.data).toContain("VERY_GOOD");
      expect(result.data).toContain("Felt calm and disciplined.");
    });
  });

  describe("exportFullBackup", () => {
    it("exports full relational backup structure without sensitive auth data", async () => {
      vi.mocked(prisma.tradingAccount.findMany).mockResolvedValue([]);
      vi.mocked(prisma.trade.findMany).mockResolvedValue([]);
      vi.mocked(prisma.journalEntry.findMany).mockResolvedValue([]);
      vi.mocked(prisma.review.findMany).mockResolvedValue([]);
      vi.mocked(prisma.tag.findMany).mockResolvedValue([]);
      vi.mocked(prisma.strategy.findMany).mockResolvedValue([]);
      vi.mocked(prisma.setup.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mistake.findMany).mockResolvedValue([]);

      const result = await exportFullBackup();

      expect(result.format).toBe("json");
      expect(result.dataset).toBe("full");

      const backup = JSON.parse(result.data);
      expect(backup.version).toBe("1.0");
      expect(backup.exportedAt).toBeDefined();
      expect(backup).toHaveProperty("accounts");
      expect(backup).toHaveProperty("trades");
      expect(backup).toHaveProperty("executions");
      expect(backup).toHaveProperty("tags");
      expect(backup).toHaveProperty("strategies");
      expect(backup).toHaveProperty("setups");
      expect(backup).toHaveProperty("mistakes");
      expect(backup).toHaveProperty("journalEntries");
      expect(backup).toHaveProperty("tradeNotes");
      expect(backup).toHaveProperty("reviews");
      expect(backup).toHaveProperty("attachments");

      // Verify no sensitive auth fields
      expect(backup).not.toHaveProperty("passwords");
      expect(backup).not.toHaveProperty("sessions");
      expect(backup).not.toHaveProperty("tokens");
      expect(backup).not.toHaveProperty("verifications");
    });
  });

  describe("exportData dispatcher", () => {
    it("dispatches to correct export function", async () => {
      vi.mocked(prisma.tradingAccount.findMany).mockResolvedValue([]);
      const res = await exportData({ dataset: "accounts", format: "csv" });
      expect(res.dataset).toBe("accounts");
    });
  });
});
