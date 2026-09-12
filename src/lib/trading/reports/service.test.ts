import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("server-only", () => ({}));
import { getReportOverview } from "./service";
import { prisma } from "@/lib/db/client";
import * as authSession from "@/lib/auth/session";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    trade: {
      findMany: vi.fn(),
    },
    tradingAccount: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

describe("Reports Domain Service", () => {
  const mockUserId = "usr-report-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
  });

  it("handles empty dataset with 0 trades gracefully", async () => {
    vi.mocked(prisma.trade.findMany).mockResolvedValue([]);

    const result = await getReportOverview({}, mockUserId);

    expect(result.performance.totalTrades).toBe(0);
    expect(result.performance.netPnl).toBe("0.00");
    expect(result.performance.winRate).toBe(0);
    expect(result.symbols).toHaveLength(0);
    expect(result.strategies).toHaveLength(0);
    expect(result.setups).toHaveLength(0);
    expect(result.tags).toHaveLength(0);
    expect(result.mistakes).toHaveLength(0);
    expect(result.accounts).toHaveLength(0);
    expect(result.direction.long.tradeCount).toBe(0);
    expect(result.direction.short.tradeCount).toBe(0);
    expect(result.time.daily).toHaveLength(0);
    expect(result.time.monthly).toHaveLength(0);
  });

  it("aggregates report tables across Symbol, Strategy, Setup, Tag, Mistake, Account, Direction, and Time", async () => {
    const mockTrades = [
      // Trade 1: Long AAPL win
      {
        id: "t-1",
        userId: mockUserId,
        title: "AAPL",
        side: "LONG",
        status: "CLOSED",
        entryPrice: new Prisma.Decimal("150.00"),
        exitPrice: new Prisma.Decimal("160.00"),
        entryDate: new Date("2026-05-10T10:00:00Z"),
        exitDate: new Date("2026-05-10T15:00:00Z"),
        quantity: new Prisma.Decimal(100),
        grossPnl: new Prisma.Decimal("1000.00"),
        netPnl: new Prisma.Decimal("950.00"),
        commission: new Prisma.Decimal("30.00"),
        fees: new Prisma.Decimal("20.00"),
        swap: new Prisma.Decimal("0.00"),
        actualRMultiple: new Prisma.Decimal("2.50"),
        riskAmount: new Prisma.Decimal("380.00"),
        tradingAccountId: "acc-1",
        tradingAccount: { id: "acc-1", name: "Main IBKR", currency: "USD", initialBalance: new Prisma.Decimal("10000.00") },
        strategyId: "strat-1",
        strategy: { id: "strat-1", name: "Trend Follow" },
        setupId: "setup-1",
        setup: { id: "setup-1", name: "Pullback" },
        tags: [{ tag: { id: "tag-1", name: "Tech", color: "#10b981" } }],
        mistakes: [],
      },
      // Trade 2: Short TSLA loss with mistake
      {
        id: "t-2",
        userId: mockUserId,
        title: "TSLA",
        side: "SHORT",
        status: "CLOSED",
        entryPrice: new Prisma.Decimal("200.00"),
        exitPrice: new Prisma.Decimal("205.00"),
        entryDate: new Date("2026-05-15T14:00:00Z"),
        exitDate: new Date("2026-05-15T16:00:00Z"),
        quantity: new Prisma.Decimal(50),
        grossPnl: new Prisma.Decimal("-250.00"),
        netPnl: new Prisma.Decimal("-270.00"),
        commission: new Prisma.Decimal("10.00"),
        fees: new Prisma.Decimal("10.00"),
        swap: new Prisma.Decimal("0.00"),
        actualRMultiple: new Prisma.Decimal("-1.00"),
        riskAmount: new Prisma.Decimal("270.00"),
        tradingAccountId: "acc-1",
        tradingAccount: { id: "acc-1", name: "Main IBKR", currency: "USD", initialBalance: new Prisma.Decimal("10000.00") },
        strategyId: "strat-2",
        strategy: { id: "strat-2", name: "Mean Reversion" },
        setupId: null,
        setup: null,
        tags: [],
        mistakes: [{ mistake: { id: "m-1", name: "FMO Chasing" } }],
      },
    ];

    vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as never);

    const result = await getReportOverview({}, mockUserId);

    // Performance
    expect(result.performance.totalTrades).toBe(2);
    expect(result.performance.winningTrades).toBe(1);
    expect(result.performance.losingTrades).toBe(1);
    expect(result.performance.netPnl).toBe("680.00"); // 950 - 270
    expect(result.performance.winRate).toBe(50);

    // Symbols
    expect(result.symbols).toHaveLength(2);
    const aapl = result.symbols.find((s) => s.symbol === "AAPL");
    expect(aapl).toBeDefined();
    expect(aapl?.netPnl).toBe("950.00");
    expect(aapl?.winRate).toBe(100);
    expect(aapl?.averageR).toBe("2.50");

    // Strategies
    expect(result.strategies).toHaveLength(2);
    const trend = result.strategies.find((s) => s.strategyName === "Trend Follow");
    expect(trend).toBeDefined();
    expect(trend?.netPnl).toBe("950.00");

    // Setups
    expect(result.setups).toHaveLength(2); // Pullback + No Setup

    // Tags
    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].tagName).toBe("Tech");

    // Mistakes
    expect(result.mistakes).toHaveLength(1);
    expect(result.mistakes[0].mistakeName).toBe("FMO Chasing");
    expect(result.mistakes[0].totalLoss).toBe("270.00");

    // Direction
    expect(result.direction.long.tradeCount).toBe(1);
    expect(result.direction.long.netPnl).toBe("950.00");
    expect(result.direction.short.tradeCount).toBe(1);
    expect(result.direction.short.netPnl).toBe("-270.00");

    // Time
    expect(result.time.daily).toHaveLength(2);
    expect(result.time.monthly).toHaveLength(1);
    expect(result.time.monthly[0].month).toBe("2026-05");
    expect(result.time.monthly[0].netPnl).toBe("680.00");
  });

  it("enforces userId isolation", async () => {
    vi.mocked(prisma.trade.findMany).mockResolvedValue([]);

    await getReportOverview({}, mockUserId);

    expect(prisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: mockUserId }),
      }),
    );
  });
});
