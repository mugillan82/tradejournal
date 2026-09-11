/**
 * Trading Account Domain — Service Unit Tests
 *
 * Tests the TradingAccount service functions for authentication, authorization,
 * user isolation, input validation, Decimal precision, and error mapping.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

import {
  createTradingAccount,
  getTradingAccountById,
  listTradingAccounts,
  updateTradingAccount,
  deleteTradingAccount,
} from "./service";
import { TradeServiceError } from "../trade/errors";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRequireServerUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: () => mockRequireServerUserId(),
}));

vi.mock("server-only", () => ({}));

const mockTradingAccountCreate = vi.fn();
const mockTradingAccountFindFirst = vi.fn();
const mockTradingAccountFindMany = vi.fn();
const mockTradingAccountCount = vi.fn();
const mockTradingAccountUpdate = vi.fn();
const mockTradingAccountDelete = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tradingAccount: {
      create: (...args: unknown[]) => mockTradingAccountCreate(...args),
      findFirst: (...args: unknown[]) => mockTradingAccountFindFirst(...args),
      findMany: (...args: unknown[]) => mockTradingAccountFindMany(...args),
      count: (...args: unknown[]) => mockTradingAccountCount(...args),
      update: (...args: unknown[]) => mockTradingAccountUpdate(...args),
      delete: (...args: unknown[]) => mockTradingAccountDelete(...args),
    },
    $transaction: (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: unknown) => unknown)({
          tradingAccount: {
            findFirst: (...a: unknown[]) => mockTradingAccountFindFirst(...a),
            delete: (...a: unknown[]) => mockTradingAccountDelete(...a),
          },
        });
      }
      return mockTransaction(arg);
    },
  },
}));

// ---------------------------------------------------------------------------
// Constants & Fixtures
// ---------------------------------------------------------------------------

const USER_A = "user-a";
const ACCOUNT_A = "acc-a";

const rawRecord = {
  id: ACCOUNT_A,
  userId: USER_A,
  name: "Main Trading Account",
  type: "PAPER_TRADING",
  currency: "USD",
  initialBalance: new Prisma.Decimal("10000.00"),
  currentBalance: new Prisma.Decimal("10500.50"),
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-02T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireServerUserId.mockResolvedValue(USER_A);
});

// ---------------------------------------------------------------------------
// Authentication Tests
// ---------------------------------------------------------------------------

describe("TradingAccount Service — Authentication", () => {
  it("throws AUTH_REQUIRED on unauthenticated create", async () => {
    mockRequireServerUserId.mockRejectedValue(new Error("Unauthorized"));
    await expect(
      createTradingAccount({ name: "New Account" }),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "AUTH_REQUIRED");
  });

  it("throws AUTH_REQUIRED on unauthenticated get", async () => {
    mockRequireServerUserId.mockRejectedValue(new Error("Unauthorized"));
    await expect(
      getTradingAccountById(ACCOUNT_A),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "AUTH_REQUIRED");
  });

  it("throws AUTH_REQUIRED on unauthenticated list", async () => {
    mockRequireServerUserId.mockRejectedValue(new Error("Unauthorized"));
    await expect(
      listTradingAccounts(),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "AUTH_REQUIRED");
  });

  it("throws AUTH_REQUIRED on unauthenticated update", async () => {
    mockRequireServerUserId.mockRejectedValue(new Error("Unauthorized"));
    await expect(
      updateTradingAccount(ACCOUNT_A, { name: "Updated Name" }),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "AUTH_REQUIRED");
  });

  it("throws AUTH_REQUIRED on unauthenticated delete", async () => {
    mockRequireServerUserId.mockRejectedValue(new Error("Unauthorized"));
    await expect(
      deleteTradingAccount(ACCOUNT_A),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "AUTH_REQUIRED");
  });
});

// ---------------------------------------------------------------------------
// Creation Tests
// ---------------------------------------------------------------------------

describe("TradingAccount Service — Creation", () => {
  it("creates a trading account with valid input", async () => {
    mockTradingAccountCreate.mockResolvedValue(rawRecord);

    const result = await createTradingAccount({
      name: "Main Trading Account",
      initialBalance: "10000.00",
    });

    expect(result).toEqual({
      id: ACCOUNT_A,
      userId: USER_A,
      name: "Main Trading Account",
      type: "PAPER_TRADING",
      currency: "USD",
      initialBalance: "10000",
      currentBalance: "10500.5",
      isActive: true,
      createdAt: rawRecord.createdAt,
      updatedAt: rawRecord.updatedAt,
    });

    expect(mockTradingAccountCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_A,
        name: "Main Trading Account",
        type: "PAPER_TRADING",
        currency: "USD",
      }),
    });
  });

  it("fails validation when name is missing", async () => {
    await expect(
      createTradingAccount({ name: "   " }),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "VALIDATION");
  });

  it("fails validation when balance is negative", async () => {
    await expect(
      createTradingAccount({ name: "Account", initialBalance: "-500.00" }),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "VALIDATION");
  });

  it("fails validation when currency format is invalid", async () => {
    await expect(
      createTradingAccount({ name: "Account", currency: "USDT" }),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "VALIDATION");
  });
});

// ---------------------------------------------------------------------------
// Retrieval & User Isolation Tests
// ---------------------------------------------------------------------------

describe("TradingAccount Service — Retrieval & User Isolation", () => {
  it("returns own trading account by ID", async () => {
    mockTradingAccountFindFirst.mockResolvedValue(rawRecord);

    const result = await getTradingAccountById(ACCOUNT_A);
    expect(result.id).toBe(ACCOUNT_A);
    expect(mockTradingAccountFindFirst).toHaveBeenCalledWith({
      where: { id: ACCOUNT_A, userId: USER_A },
    });
  });

  it("throws NOT_FOUND when account does not exist or belongs to another user", async () => {
    mockTradingAccountFindFirst.mockResolvedValue(null);

    await expect(
      getTradingAccountById("foreign-account"),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "NOT_FOUND");
  });

  it("lists only accounts belonging to authenticated user", async () => {
    mockTransaction.mockResolvedValue([[rawRecord], 1]);

    const result = await listTradingAccounts({
      filters: { search: "Main" },
      pagination: { page: 1, pageSize: 10 },
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockTransaction).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Update & Delete Tests
// ---------------------------------------------------------------------------

describe("TradingAccount Service — Update & Delete", () => {
  it("updates own trading account successfully", async () => {
    mockTradingAccountFindFirst.mockResolvedValue(rawRecord);
    mockTradingAccountUpdate.mockResolvedValue({
      ...rawRecord,
      name: "Updated Account Name",
    });

    const result = await updateTradingAccount(ACCOUNT_A, {
      name: "Updated Account Name",
    });

    expect(result.name).toBe("Updated Account Name");
    expect(mockTradingAccountUpdate).toHaveBeenCalledWith({
      where: { id: ACCOUNT_A },
      data: expect.objectContaining({ name: "Updated Account Name" }),
    });
  });

  it("throws NOT_FOUND on updating another user's account", async () => {
    mockTradingAccountFindFirst.mockResolvedValue(null);

    await expect(
      updateTradingAccount("foreign-acc", { name: "Hack Name" }),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "NOT_FOUND");
  });

  it("deletes own trading account successfully", async () => {
    mockTradingAccountFindFirst.mockResolvedValue({ id: ACCOUNT_A });
    mockTradingAccountDelete.mockResolvedValue(rawRecord);

    await deleteTradingAccount(ACCOUNT_A);

    expect(mockTradingAccountDelete).toHaveBeenCalledWith({
      where: { id: ACCOUNT_A },
    });
  });

  it("throws NOT_FOUND on deleting another user's account", async () => {
    mockTradingAccountFindFirst.mockResolvedValue(null);

    await expect(
      deleteTradingAccount("foreign-acc"),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// Error Handling Tests
// ---------------------------------------------------------------------------

describe("TradingAccount Service — Error Handling", () => {
  it("converts unknown database error into DATABASE_ERROR", async () => {
    mockTradingAccountFindFirst.mockRejectedValue(new Error("Database offline"));

    await expect(
      getTradingAccountById(ACCOUNT_A),
    ).rejects.toSatisfy((err: unknown) => err instanceof TradeServiceError && err.code === "DATABASE_ERROR");
  });
});
