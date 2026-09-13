import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("server-only", () => ({}));
import {
  getMonthCalendar,
  normalizeMonthParam,
  getMonthDateRange,
} from "./service";
import { prisma } from "@/lib/db/client";
import * as authSession from "@/lib/auth/session";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    trade: {
      findMany: vi.fn(),
    },
    journalEntry: {
      findMany: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

describe("Calendar Domain Service", () => {
  const mockUserId = "usr-calendar-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
    vi.mocked(prisma.review.findMany).mockResolvedValue([]);
  });

  describe("normalizeMonthParam & getMonthDateRange", () => {
    it("validates valid YYYY-MM strings", () => {
      expect(normalizeMonthParam("2026-09")).toBe("2026-09");
      expect(normalizeMonthParam("2025-12")).toBe("2025-12");
    });

    it("falls back to current UTC month for null, undefined, or malformed strings", () => {
      const fallback = normalizeMonthParam("invalid-date");
      expect(fallback).toMatch(/^\d{4}-\d{2}$/);

      const nullFallback = normalizeMonthParam(null);
      expect(nullFallback).toMatch(/^\d{4}-\d{2}$/);
    });

    it("calculates accurate UTC date boundaries for February in leap/non-leap year", () => {
      const { startOfMonth: start2024, endOfMonth: end2024 } = getMonthDateRange("2024-02");
      expect(start2024.toISOString()).toBe("2024-02-01T00:00:00.000Z");
      expect(end2024.toISOString()).toBe("2024-02-29T23:59:59.999Z");

      const { startOfMonth: start2025, endOfMonth: end2025 } = getMonthDateRange("2025-02");
      expect(start2025.toISOString()).toBe("2025-02-01T00:00:00.000Z");
      expect(end2025.toISOString()).toBe("2025-02-28T23:59:59.999Z");
    });
  });

  describe("getMonthCalendar", () => {
    it("handles empty month with 0 trades and 0 journal entries gracefully", async () => {
      vi.mocked(prisma.trade.findMany).mockResolvedValue([]);
      vi.mocked(prisma.journalEntry.findMany).mockResolvedValue([]);

      const result = await getMonthCalendar("2026-09");

      expect(result.month).toBe("2026-09");
      expect(result.summary.totalTrades).toBe(0);
      expect(result.summary.netPnl).toBe("0.00");
      expect(result.summary.winRate).toBe(0);
      expect(result.summary.winningDays).toBe(0);
      expect(result.summary.losingDays).toBe(0);
      expect(result.summary.bestDay).toBeNull();
      expect(result.summary.worstDay).toBeNull();
      expect(result.summary.averageDailyPnl).toBe("0.00");
      expect(Object.keys(result.days)).toHaveLength(0);
    });

    it("aggregates multiple trades across days, computing daily P&L, R-multiple, best/worst days, and journal integration", async () => {
      const mockTrades = [
        // Day 1: Winning trade
        {
          id: "t-1",
          userId: mockUserId,
          title: "AAPL",
          side: "LONG",
          status: "CLOSED",
          entryPrice: new Prisma.Decimal("150.00"),
          exitPrice: new Prisma.Decimal("155.00"),
          entryDate: new Date("2026-09-02T10:00:00Z"),
          exitDate: new Date("2026-09-02T15:00:00Z"),
          quantity: new Prisma.Decimal(100),
          grossPnl: new Prisma.Decimal("500.00"),
          netPnl: new Prisma.Decimal("480.00"),
          actualRMultiple: new Prisma.Decimal("2.40"),
          riskAmount: new Prisma.Decimal("200.00"),
          tradingAccountId: "acc-1",
          tradingAccount: { id: "acc-1", name: "Main", currency: "USD" },
          strategyId: "strat-1",
          strategy: { id: "strat-1", name: "Breakout" },
          setupId: "setup-1",
          setup: { id: "setup-1", name: "Bull Flag" },
          tags: [{ tag: { id: "tag-1", name: "Tech", color: "#10b981" } }],
          mistakes: [],
        },
        // Day 1: Another winning trade
        {
          id: "t-2",
          userId: mockUserId,
          title: "MSFT",
          side: "LONG",
          status: "CLOSED",
          entryPrice: new Prisma.Decimal("300.00"),
          exitPrice: new Prisma.Decimal("305.00"),
          entryDate: new Date("2026-09-02T11:00:00Z"),
          exitDate: new Date("2026-09-02T16:00:00Z"),
          quantity: new Prisma.Decimal(50),
          grossPnl: new Prisma.Decimal("250.00"),
          netPnl: new Prisma.Decimal("240.00"),
          actualRMultiple: new Prisma.Decimal("1.20"),
          riskAmount: new Prisma.Decimal("200.00"),
          tradingAccountId: "acc-1",
          tradingAccount: { id: "acc-1", name: "Main", currency: "USD" },
          strategy: null,
          setup: null,
          tags: [],
          mistakes: [],
        },
        // Day 2: Losing trade
        {
          id: "t-3",
          userId: mockUserId,
          title: "TSLA",
          side: "SHORT",
          status: "CLOSED",
          entryPrice: new Prisma.Decimal("250.00"),
          exitPrice: new Prisma.Decimal("255.00"),
          entryDate: new Date("2026-09-05T14:00:00Z"),
          exitDate: new Date("2026-09-05T15:30:00Z"),
          quantity: new Prisma.Decimal(50),
          grossPnl: new Prisma.Decimal("-250.00"),
          netPnl: new Prisma.Decimal("-260.00"),
          actualRMultiple: new Prisma.Decimal("-1.00"),
          riskAmount: new Prisma.Decimal("260.00"),
          tradingAccountId: "acc-1",
          tradingAccount: { id: "acc-1", name: "Main", currency: "USD" },
          strategy: null,
          setup: null,
          tags: [],
          mistakes: [{ mistake: { id: "m-1", name: "Chasing" } }],
        },
      ];

      const mockJournals = [
        {
          id: "j-1",
          userId: mockUserId,
          entryDate: new Date("2026-09-02T00:00:00Z"),
          mood: "VERY_GOOD",
          notes: "Solid execution on AAPL and MSFT",
        },
      ];

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as never);
      vi.mocked(prisma.journalEntry.findMany).mockResolvedValue(mockJournals as never);

      const result = await getMonthCalendar("2026-09");

      // Month Summary
      expect(result.summary.totalTrades).toBe(3);
      expect(result.summary.closedTrades).toBe(3);
      expect(result.summary.winningTrades).toBe(2);
      expect(result.summary.losingTrades).toBe(1);
      expect(result.summary.netPnl).toBe("460.00"); // 480 + 240 - 260
      expect(result.summary.winRate).toBe(66.67);
      expect(result.summary.winningDays).toBe(1);
      expect(result.summary.losingDays).toBe(1);
      expect(result.summary.bestDay).toEqual({ date: "2026-09-02", netPnl: "720.00" });
      expect(result.summary.worstDay).toEqual({ date: "2026-09-05", netPnl: "-260.00" });
      expect(result.summary.averageDailyPnl).toBe("230.00"); // 460 / 2 days

      // Day 1 (2026-09-02)
      const day1 = result.days["2026-09-02"];
      expect(day1).toBeDefined();
      expect(day1.tradeCount).toBe(2);
      expect(day1.winCount).toBe(2);
      expect(day1.lossCount).toBe(0);
      expect(day1.netPnl).toBe("720.00");
      expect(day1.winRate).toBe(100);
      expect(day1.totalR).toBe("3.60"); // 2.40 + 1.20
      expect(day1.hasJournalEntry).toBe(true);
      expect(day1.journalMood).toBe("VERY_GOOD");
      expect(day1.trades).toHaveLength(2);

      // Day 2 (2026-09-05)
      const day2 = result.days["2026-09-05"];
      expect(day2).toBeDefined();
      expect(day2.tradeCount).toBe(1);
      expect(day2.lossCount).toBe(1);
      expect(day2.netPnl).toBe("-260.00");
      expect(day2.winRate).toBe(0);
      expect(day2.totalR).toBe("-1.00");
      expect(day2.hasJournalEntry).toBe(false);
    });

    it("enforces userId filtering to prevent cross-user leakage", async () => {
      vi.mocked(prisma.trade.findMany).mockResolvedValue([]);
      vi.mocked(prisma.journalEntry.findMany).mockResolvedValue([]);

      await getMonthCalendar("2026-09");

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
        }),
      );
      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
        }),
      );
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
        }),
      );
    });
  });
});
