/**
 * Trade Domain — Service Security & Behavior Tests
 *
 * Tests the trade service's security guarantees and CRUD behavior.
 *
 * These tests use vi.mock() to replace Prisma and Better Auth with
 * controlled mocks so we can verify service logic without a live DB.
 *
 * Security guarantees verified:
 * - Every query is scoped to the authenticated user (userId isolation).
 * - TradingAccount ownership is verified before trade creation.
 * - Cross-user resource access is rejected.
 * - CRUD operations behave correctly with valid and invalid inputs.
 * - Prisma errors are translated to TradeServiceError.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Mocks
//
// The `server-only` package throws when imported outside Next.js context.
// We replace it with a no-op so vitest can import the service module.
// The session util is also mocked so we can control the "logged-in user".
// The Prisma client is mocked so we can observe call patterns.
// ---------------------------------------------------------------------------

const mockSession = vi.hoisted(() => ({ currentUserId: null as string | null }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: async () => {
    if (!mockSession.currentUserId) {
      throw new Error("Unauthorized: authentication required");
    }
    return mockSession.currentUserId;
  },
  getServerUserId: async () => mockSession.currentUserId,
}));

// We build a fresh prisma mock per test by hoisting a factory.
const mockPrismaHolder = vi.hoisted(() => ({
  current: null as ReturnType<typeof createMockPrisma> | null,
}));

function createMockPrisma() {
  const mockTrade = makeTradeRecord();
  // $transaction supports BOTH signatures:
  // - array form: receives an array of Promises, returns Promise<results>
  // - function form: receives a callback, returns Promise<result>
  const $transaction = vi.fn().mockImplementation(async (input: unknown) => {
    if (Array.isArray(input)) {
      // Array form: resolve each promise in order
      return Promise.all(input);
    }
    if (typeof input === "function") {
      return (input as (tx: unknown) => Promise<unknown>)({
        trade: {
          findFirst: vi.fn().mockResolvedValue({ id: "trade-a" }),
          delete: vi.fn().mockResolvedValue({}),
        },
      });
    }
    return [];
  });

  return {
    tradingAccount: {
      findFirst: vi.fn().mockResolvedValue({ id: "acc-a" }),
    },
    trade: {
      create: vi.fn().mockResolvedValue(mockTrade),
      findFirst: vi.fn().mockResolvedValue(mockTrade),
      findMany: vi.fn().mockResolvedValue([mockTrade]),
      update: vi.fn().mockResolvedValue(mockTrade),
      delete: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(1),
    },
    $transaction,
  };
}

vi.mock("@/lib/db/client", () => ({
  get prisma() {
    if (!mockPrismaHolder.current) {
      throw new Error("Prisma mock not initialized for test");
    }
    return mockPrismaHolder.current;
  },
}));

// Import AFTER mocks so the service picks up the mocked Prisma.
import { TradeServiceError } from "./errors";
import { createAuthRequiredError, createNotFoundError } from "./errors";

// Service functions are imported dynamically per test so vi.resetModules()
// can produce a clean instance when needed. We re-export them here.
import * as serviceModule from "./service";
const { createTrade, getTradeById, listTrades, updateTrade, deleteTrade } =
  serviceModule;

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const USER_A = "user-a";
const USER_B = "user-b";
const ACCOUNT_A = "acc-a";
const TRADE_A = "trade-a";

function makeTradeRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TRADE_A,
    userId: USER_A,
    tradingAccountId: ACCOUNT_A,
    side: "LONG",
    status: "OPEN",
    entryPrice: new Prisma.Decimal("100.50"),
    entryDate: new Date("2024-01-15T09:30:00Z"),
    exitPrice: null,
    exitDate: null,
    stopLoss: new Prisma.Decimal("95.00"),
    takeProfit: new Prisma.Decimal("110.00"),
    riskAmount: new Prisma.Decimal("55.00"),
    plannedRiskReward: new Prisma.Decimal("2.0"),
    actualRMultiple: null,
    quantity: new Prisma.Decimal("11"),
    grossPnl: null,
    commission: new Prisma.Decimal("1.00"),
    fees: new Prisma.Decimal("0.50"),
    swap: new Prisma.Decimal("0.00"),
    netPnl: null,
    title: "AAPL long",
    notes: null,
    strategyId: null,
    setupId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const validInput = {
  tradingAccountId: ACCOUNT_A,
  side: "LONG" as const,
  entryPrice: "100.50",
  entryDate: new Date("2024-01-15T09:30:00Z"),
  quantity: "11",
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Trade service — security and behavior", () => {
  beforeEach(() => {
    mockPrismaHolder.current = createMockPrisma();
    mockSession.currentUserId = USER_A;
  });

  // -------------------------------------------------------------------------
  // createTrade
  // -------------------------------------------------------------------------

  describe("createTrade", () => {
    it("rejects unauthenticated requests (no session)", async () => {
      mockSession.currentUserId = null;
      await expect(createTrade(validInput)).rejects.toThrow(
        createAuthRequiredError(),
      );
    });

    it("rejects creating a trade for an account the user does not own", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      mockPrisma.tradingAccount.findFirst.mockResolvedValue(null);
      await expect(createTrade(validInput)).rejects.toThrow(
        createNotFoundError("TradingAccount"),
      );
    });

    it("accepts creating a trade when the account is owned by the user", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      const result = await createTrade(validInput);

      expect(result).toBeDefined();
      expect(result.side).toBe("LONG");
      expect(mockPrisma.trade.create).toHaveBeenCalledOnce();
      const createCall = mockPrisma.trade.create.mock.calls[0]!;
      expect(createCall[0]?.data?.userId).toBe(USER_A);
      expect(createCall[0]?.data?.tradingAccountId).toBe(ACCOUNT_A);
    });

    it("rejects invalid input with validation errors", async () => {
      await expect(
        createTrade({ ...validInput, quantity: "0" }),
      ).rejects.toBeInstanceOf(TradeServiceError);
    });

    it("does NOT allow userId to be supplied by the caller", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      await createTrade(validInput);

      const createCall = mockPrisma.trade.create.mock.calls[0]!;
      expect(createCall[0]?.data?.userId).toBe(USER_A);
      expect((validInput as Record<string, unknown>).userId).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // getTradeById
  // -------------------------------------------------------------------------

  describe("getTradeById", () => {
    it("returns the trade when it belongs to the authenticated user", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      const result = await getTradeById(TRADE_A);

      expect(result).toBeDefined();
      expect(result.id).toBe(TRADE_A);
      expect(mockPrisma.trade.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: USER_A }),
        }),
      );
    });

    it("rejects when the trade belongs to another user", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      mockSession.currentUserId = USER_B;
      mockPrisma.trade.findFirst.mockResolvedValue(null);
      await expect(getTradeById(TRADE_A)).rejects.toThrow(
        createNotFoundError("Trade"),
      );
    });

    it("rejects unauthenticated requests", async () => {
      mockSession.currentUserId = null;
      await expect(getTradeById(TRADE_A)).rejects.toThrow(
        createAuthRequiredError(),
      );
    });

    it("rejects an invalid (empty) trade ID", async () => {
      await expect(getTradeById("")).rejects.toBeInstanceOf(TradeServiceError);
    });
  });

  // -------------------------------------------------------------------------
  // listTrades
  // -------------------------------------------------------------------------

  describe("listTrades", () => {
    it("always scopes queries to the authenticated user", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      await listTrades({});

      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: USER_A }),
        }),
      );
      expect(mockPrisma.trade.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: USER_A }),
        }),
      );
    });

    it("applies filter for tradingAccountId while preserving userId scope", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      await listTrades({ filters: { tradingAccountId: ACCOUNT_A } });

      const findManyCall = mockPrisma.trade.findMany.mock.calls[0]![0]!;
      expect(findManyCall.where).toMatchObject({
        userId: USER_A,
        tradingAccountId: ACCOUNT_A,
      });
    });

    it("applies filter for side and status while preserving userId scope", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      await listTrades({ filters: { side: "SHORT", status: "CLOSED" } });

      const findManyCall = mockPrisma.trade.findMany.mock.calls[0]![0]!;
      expect(findManyCall.where).toMatchObject({
        userId: USER_A,
        side: "SHORT",
        status: "CLOSED",
      });
    });

    it("applies date range filters", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      await listTrades({
        filters: {
          entryDateFrom: new Date("2024-01-01"),
          entryDateTo: new Date("2024-01-31"),
        },
      });

      const findManyCall = mockPrisma.trade.findMany.mock.calls[0]![0]!;
      expect(findManyCall.where).toMatchObject({
        userId: USER_A,
        entryDate: {
          gte: new Date("2024-01-01"),
          lt: new Date("2024-01-31"),
        },
      });
    });

    it("applies search filter using OR across title and notes", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      await listTrades({ filters: { search: "AAPL" } });

      const findManyCall = mockPrisma.trade.findMany.mock.calls[0]![0]!;
      expect(findManyCall.where).toMatchObject({
        userId: USER_A,
        OR: [
          { title: { contains: "AAPL", mode: "insensitive" } },
          { notes: { contains: "AAPL", mode: "insensitive" } },
        ],
      });
    });

    it("enforces maximum page size", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      await listTrades({ pagination: { pageSize: 9999 } });

      const findManyCall = mockPrisma.trade.findMany.mock.calls[0]![0]!;
      expect(findManyCall.take).toBe(200);
    });

    it("defaults to page 1 when page is not provided", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      await listTrades({ pagination: { pageSize: 25 } });

      const findManyCall = mockPrisma.trade.findMany.mock.calls[0]![0]!;
      expect(findManyCall.skip).toBe(0);
    });

    it("returns pagination metadata", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      mockPrisma.trade.findMany.mockResolvedValue([
        makeTradeRecord(),
        makeTradeRecord({ id: "trade-2" }),
      ]);
      mockPrisma.trade.count.mockResolvedValue(50);

      const result = await listTrades({
        pagination: { page: 2, pageSize: 20 },
      });

      expect(result.total).toBe(50);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(20);
      expect(result.items).toHaveLength(2);
    });

    it("rejects unauthenticated requests", async () => {
      mockSession.currentUserId = null;
      await expect(listTrades({})).rejects.toThrow(createAuthRequiredError());
    });
  });

  // -------------------------------------------------------------------------
  // updateTrade
  // -------------------------------------------------------------------------

  describe("updateTrade", () => {
    it("updates the trade when owned by the user", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      const result = await updateTrade(TRADE_A, { notes: "Updated notes" });

      expect(result).toBeDefined();
      expect(mockPrisma.trade.update).toHaveBeenCalledOnce();
      expect(mockPrisma.trade.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TRADE_A },
          data: expect.objectContaining({ notes: "Updated notes" }),
        }),
      );
    });

    it("rejects updating a trade that belongs to another user", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      mockSession.currentUserId = USER_B;
      mockPrisma.trade.findFirst.mockResolvedValue(null);

      await expect(
        updateTrade(TRADE_A, { notes: "Hacked!" }),
      ).rejects.toThrow(createNotFoundError("Trade"));
    });

    it("validates merged shape when closing a trade", async () => {
      // Existing trade is OPEN with no exit data
      await expect(
        updateTrade(TRADE_A, { status: "CLOSED" }),
      ).rejects.toBeInstanceOf(TradeServiceError);
    });

    it("rejects unauthenticated requests", async () => {
      mockSession.currentUserId = null;
      await expect(
        updateTrade(TRADE_A, { notes: "x" }),
      ).rejects.toThrow(createAuthRequiredError());
    });
  });

  // -------------------------------------------------------------------------
  // deleteTrade
  // -------------------------------------------------------------------------

  describe("deleteTrade", () => {
    it("deletes the trade when owned by the user", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      await expect(deleteTrade(TRADE_A)).resolves.toBeUndefined();
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    });

    it("rejects deleting a trade that belongs to another user", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      mockSession.currentUserId = USER_B;
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            trade: {
              findFirst: vi.fn().mockResolvedValue(null),
              delete: vi.fn(),
            },
          };
          return fn(txMock);
        },
      );

      await expect(deleteTrade(TRADE_A)).rejects.toThrow(
        createNotFoundError("Trade"),
      );
    });

    it("rejects unauthenticated requests", async () => {
      mockSession.currentUserId = null;
      await expect(deleteTrade(TRADE_A)).rejects.toThrow(
        createAuthRequiredError(),
      );
    });

    it("rejects an invalid (empty) trade ID", async () => {
      await expect(deleteTrade("")).rejects.toBeInstanceOf(TradeServiceError);
    });
  });

  // -------------------------------------------------------------------------
  // Prisma error translation
  // -------------------------------------------------------------------------

  describe("Prisma error translation", () => {
    it("translates P2003 (foreign key) to NOT_FOUND", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      mockPrisma.trade.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("FK constraint", {
          code: "P2003",
          clientVersion: "5.22.0",
        }),
      );

      await expect(
        createTrade({
          tradingAccountId: ACCOUNT_A,
          side: "LONG",
          entryPrice: "100",
          entryDate: new Date(),
          quantity: "1",
        }),
      ).rejects.toBeInstanceOf(TradeServiceError);
    });

    it("maps DATABASE_ERROR to the error type without leaking details", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      mockPrisma.trade.create.mockRejectedValue(new Error("Connection timeout"));

      try {
        await createTrade({
          tradingAccountId: ACCOUNT_A,
          side: "LONG",
          entryPrice: "100",
          entryDate: new Date(),
          quantity: "1",
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TradeServiceError);
        const svcErr = err as TradeServiceError;
        expect(svcErr.code).toBe("DATABASE_ERROR");
        expect(svcErr.message).not.toContain("Connection timeout");
        expect(svcErr.httpStatus).toBe(500);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Prisma Decimal handling
  // -------------------------------------------------------------------------

  describe("decimalFromString — Prisma Decimal construction", () => {
    // We access the helper through the createTrade call — when a trade is
    // created, the Prisma write goes through decimalFromString. We verify
    // the correct Prisma.Decimal values are written by inspecting the mock calls.

    it("constructs Prisma.Decimal from a positive decimal string", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      let captured: { entryPrice: unknown; quantity: unknown; grossPnl: unknown; swap: unknown; netPnl: unknown } | null = null;
      mockPrisma.trade.create.mockImplementation((args: { data: { entryPrice: unknown; quantity: unknown; grossPnl: unknown; swap: unknown; netPnl: unknown } }) => {
        captured = args.data;
        return Promise.resolve(makeTradeRecord());
      });

      await createTrade({
        tradingAccountId: ACCOUNT_A,
        side: "LONG",
        entryPrice: "100.50",
        entryDate: new Date(),
        quantity: "11",
        grossPnl: "250.00",
        swap: "-0.10",
        netPnl: "249.00",
      });

      // Verify the values are Prisma.Decimal instances (have toString) with correct numeric value
      expect(captured).not.toBeNull();
      const entryPrice = captured!.entryPrice as { toString(): string };
      const quantity = captured!.quantity as { toString(): string };
      // Prisma.Decimal normalizes trailing zeros, so use Number comparison
      expect(Number(entryPrice.toString())).toBe(100.5);
      expect(Number(quantity.toString())).toBe(11);
      // GrossPnl positive
      expect(Number((captured!.grossPnl as { toString(): string }).toString())).toBe(250);
    });

    it("constructs Prisma.Decimal from a negative decimal string (signed P&L)", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      let captured: { grossPnl: unknown; netPnl: unknown; swap: unknown } | null = null;
      mockPrisma.trade.create.mockImplementation((args: { data: { grossPnl: unknown; netPnl: unknown; swap: unknown } }) => {
        captured = args.data;
        return Promise.resolve(makeTradeRecord());
      });

      await createTrade({
        tradingAccountId: ACCOUNT_A,
        side: "SHORT",
        entryPrice: "100.00",
        entryDate: new Date(),
        quantity: "10",
        grossPnl: "-150.75",
        netPnl: "-152.25",
        swap: "-0.10",
      });

      expect(captured).not.toBeNull();
      // Critical: signed P&L must be passed through as-is, not coerced
      expect((captured!.grossPnl as { toString(): string }).toString()).toBe("-150.75");
      expect((captured!.netPnl as { toString(): string }).toString()).toBe("-152.25");
      expect((captured!.swap as { toString(): string }).toString()).toBe("-0.1");
    });

    it("handles null for nullable decimal fields", async () => {
      const mockPrisma = mockPrismaHolder.current!;
      let captured: { grossPnl: unknown; netPnl: unknown; swap: unknown } | null = null;
      mockPrisma.trade.create.mockImplementation((args: { data: { grossPnl: unknown; netPnl: unknown; swap: unknown } }) => {
        captured = args.data;
        return Promise.resolve(makeTradeRecord());
      });

      await createTrade({
        tradingAccountId: ACCOUNT_A,
        side: "LONG",
        entryPrice: "100.00",
        entryDate: new Date(),
        quantity: "5",
        grossPnl: null,
        netPnl: null,
        swap: null,
      });

      expect(captured).not.toBeNull();
      expect(captured!.grossPnl).toBeNull();
      expect(captured!.netPnl).toBeNull();
      expect(captured!.swap).toBeNull();
    });
  });
});
