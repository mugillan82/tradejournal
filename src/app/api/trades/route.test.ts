/**
 * Trade API — Route Integration Tests
 *
 * Tests Next.js App Router trade API endpoints.
 * Route handlers:
 *   - src/app/api/trades/route.ts (POST, GET)
 *   - src/app/api/trades/[id]/route.ts (GET, PATCH, DELETE)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  createAuthRequiredError,
  createDatabaseError,
  createNotFoundError,
  createValidationError,
} from "@/lib/trading/trade/errors";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateTrade = vi.fn();
const mockListTrades = vi.fn();
const mockGetTradeById = vi.fn();
const mockUpdateTrade = vi.fn();
const mockDeleteTrade = vi.fn();

// Mock service module with exact `@/lib/trading/trade/service` path alias
vi.mock("@/lib/trading/trade/service", () => ({
  createTrade: (...args: unknown[]) => mockCreateTrade(...args),
  listTrades: (...args: unknown[]) => mockListTrades(...args),
  getTradeById: (...args: unknown[]) => mockGetTradeById(...args),
  updateTrade: (...args: unknown[]) => mockUpdateTrade(...args),
  deleteTrade: (...args: unknown[]) => mockDeleteTrade(...args),
}));

const mockRequireServerUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: () => mockRequireServerUserId(),
}));

vi.mock("server-only", () => ({}));

// ---------------------------------------------------------------------------
// Constants & Mock Data
// ---------------------------------------------------------------------------

const USER_A = "user-a";
const ACCOUNT_A = "acc-a";
const TRADE_A = "trade-a";

const validCreateInput = {
  tradingAccountId: ACCOUNT_A,
  side: "LONG",
  entryPrice: "100.50",
  entryDate: "2024-01-15T09:30:00Z",
  quantity: "11",
};

const validUpdateInput = { notes: "Updated notes" };

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireServerUserId.mockResolvedValue(USER_A);
});

// ---------------------------------------------------------------------------
// HTTP Method Exports (App Router Method Enforcement)
// ---------------------------------------------------------------------------

describe("HTTP Method Exports Verification", () => {
  it("verifies /api/trades exports ONLY GET and POST handlers", async () => {
    const route = await import("./route");
    expect(route.GET).toBeDefined();
    expect(route.POST).toBeDefined();
    expect((route as Record<string, unknown>).PUT).toBeUndefined();
    expect((route as Record<string, unknown>).DELETE).toBeUndefined();
    expect((route as Record<string, unknown>).PATCH).toBeUndefined();
    expect((route as Record<string, unknown>).OPTIONS).toBeUndefined();
  });

  it("verifies /api/trades/[id] exports ONLY GET, PATCH, and DELETE handlers", async () => {
    const route = await import("./[id]/route");
    expect(route.GET).toBeDefined();
    expect(route.PATCH).toBeDefined();
    expect(route.DELETE).toBeDefined();
    expect((route as Record<string, unknown>).POST).toBeUndefined();
    expect((route as Record<string, unknown>).PUT).toBeUndefined();
    expect((route as Record<string, unknown>).OPTIONS).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/trades
// ---------------------------------------------------------------------------

describe("POST /api/trades", () => {
  it("returns 201 when trade is created successfully", async () => {
    const mockTrade = { id: TRADE_A, ...validCreateInput };
    mockCreateTrade.mockResolvedValue(mockTrade);

    const request = new NextRequest("http://localhost:3000/api/trades", {
      method: "POST",
      body: JSON.stringify(validCreateInput),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./route");
    const response = await route.POST(request);

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(mockTrade);
    expect(mockCreateTrade).toHaveBeenCalledWith(validCreateInput);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockRequireServerUserId.mockRejectedValue(new Error("Unauthorized"));

    const request = new NextRequest("http://localhost:3000/api/trades", {
      method: "POST",
      body: JSON.stringify(validCreateInput),
    });

    const route = await import("./route");
    const response = await route.POST(request);

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: { code: "AUTH_REQUIRED", message: "Authentication required" },
    });
  });

  it("returns 400 when request body is malformed JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/trades", {
      method: "POST",
      body: "invalid-json{",
      headers: { "content-type": "application/json" },
    });

    const route = await import("./route");
    const response = await route.POST(request);

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_BODY", message: "Request body must be valid JSON" },
    });
  });

  it("returns 400 when service throws validation error", async () => {
    mockCreateTrade.mockRejectedValue(
      createValidationError([{ path: "quantity", message: "quantity must be positive" }]),
    );

    const request = new NextRequest("http://localhost:3000/api/trades", {
      method: "POST",
      body: JSON.stringify({ ...validCreateInput, quantity: "-5" }),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./route");
    const response = await route.POST(request);

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION",
        fieldErrors: [{ path: "quantity", message: "quantity must be positive" }],
      },
    });
  });

  it("returns 404 when referencing foreign/nonexistent TradingAccount", async () => {
    mockCreateTrade.mockRejectedValue(createNotFoundError("TradingAccount"));

    const request = new NextRequest("http://localhost:3000/api/trades", {
      method: "POST",
      body: JSON.stringify({ ...validCreateInput, tradingAccountId: "foreign-acc" }),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./route");
    const response = await route.POST(request);

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: { code: "NOT_FOUND", message: "TradingAccount not found" },
    });
  });

  it("returns 500 when a database error occurs without leaking details", async () => {
    mockCreateTrade.mockRejectedValue(createDatabaseError(new Error("Prisma fatal connection error")));

    const request = new NextRequest("http://localhost:3000/api/trades", {
      method: "POST",
      body: JSON.stringify(validCreateInput),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./route");
    const response = await route.POST(request);

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.error.code).toBe("DATABASE_ERROR");
    expect(body.error.message).not.toContain("Prisma");
    expect(body.error.message).not.toContain("connection");
  });
});

// ---------------------------------------------------------------------------
// GET /api/trades
// ---------------------------------------------------------------------------

describe("GET /api/trades", () => {
  it("returns 200 with trade list and query options applied", async () => {
    const listResult = {
      items: [{ id: TRADE_A }],
      total: 1,
      page: 1,
      pageSize: 50,
    };
    mockListTrades.mockResolvedValue(listResult);

    const request = new NextRequest(
      "http://localhost:3000/api/trades?tradingAccountId=acc-a&side=LONG&status=OPEN&page=1&pageSize=50",
      { method: "GET" },
    );

    const route = await import("./route");
    const response = await route.GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(listResult);
    expect(mockListTrades).toHaveBeenCalledWith({
      filters: {
        tradingAccountId: "acc-a",
        side: "LONG",
        status: "OPEN",
      },
      sort: {
        field: "entryDate",
        direction: "desc",
      },
      pagination: {
        page: 1,
        pageSize: 50,
      },
    });
  });

  it("returns 401 when user is not authenticated", async () => {
    mockRequireServerUserId.mockRejectedValue(new Error("Unauthorized"));

    const request = new NextRequest("http://localhost:3000/api/trades", {
      method: "GET",
    });

    const route = await import("./route");
    const response = await route.GET(request);

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

// ---------------------------------------------------------------------------
// GET /api/trades/[id]
// ---------------------------------------------------------------------------

describe("GET /api/trades/[id]", () => {
  it("returns 200 when own trade exists", async () => {
    const mockTrade = { id: TRADE_A, userId: USER_A };
    mockGetTradeById.mockResolvedValue(mockTrade);

    const request = new NextRequest(`http://localhost:3000/api/trades/${TRADE_A}`, {
      method: "GET",
    });

    const route = await import("./[id]/route");
    const response = await route.GET(request, { params: { id: TRADE_A } });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(mockTrade);
    expect(mockGetTradeById).toHaveBeenCalledWith(TRADE_A);
  });

  it("returns 404 when trade does not exist or belongs to another user", async () => {
    mockGetTradeById.mockRejectedValue(createNotFoundError("Trade"));

    const request = new NextRequest(`http://localhost:3000/api/trades/${TRADE_A}`, {
      method: "GET",
    });

    const route = await import("./[id]/route");
    const response = await route.GET(request, { params: { id: TRADE_A } });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: { code: "NOT_FOUND", message: "Trade not found" },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireServerUserId.mockRejectedValue(new Error("Unauthorized"));

    const request = new NextRequest(`http://localhost:3000/api/trades/${TRADE_A}`, {
      method: "GET",
    });

    const route = await import("./[id]/route");
    const response = await route.GET(request, { params: { id: TRADE_A } });

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/trades/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/trades/[id]", () => {
  it("returns 200 when trade is updated successfully", async () => {
    const updatedTrade = { id: TRADE_A, notes: "Updated notes" };
    mockUpdateTrade.mockResolvedValue(updatedTrade);

    const request = new NextRequest(`http://localhost:3000/api/trades/${TRADE_A}`, {
      method: "PATCH",
      body: JSON.stringify(validUpdateInput),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./[id]/route");
    const response = await route.PATCH(request, { params: { id: TRADE_A } });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(updatedTrade);
    expect(mockUpdateTrade).toHaveBeenCalledWith(TRADE_A, validUpdateInput);
  });

  it("returns 400 when update payload is invalid", async () => {
    mockUpdateTrade.mockRejectedValue(
      createValidationError([{ path: "quantity", message: "quantity cannot be zero" }]),
    );

    const request = new NextRequest(`http://localhost:3000/api/trades/${TRADE_A}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: "0" }),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./[id]/route");
    const response = await route.PATCH(request, { params: { id: TRADE_A } });

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 404 when trade to update does not exist or belongs to another user", async () => {
    mockUpdateTrade.mockRejectedValue(createNotFoundError("Trade"));

    const request = new NextRequest(`http://localhost:3000/api/trades/${TRADE_A}`, {
      method: "PATCH",
      body: JSON.stringify(validUpdateInput),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./[id]/route");
    const response = await route.PATCH(request, { params: { id: TRADE_A } });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/trades/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/trades/[id]", () => {
  it("returns 204 when trade is deleted successfully", async () => {
    mockDeleteTrade.mockResolvedValue(undefined);

    const request = new NextRequest(`http://localhost:3000/api/trades/${TRADE_A}`, {
      method: "DELETE",
    });

    const route = await import("./[id]/route");
    const response = await route.DELETE(request, { params: { id: TRADE_A } });

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mockDeleteTrade).toHaveBeenCalledWith(TRADE_A);
  });

  it("returns 404 when trade does not exist or belongs to another user", async () => {
    mockDeleteTrade.mockRejectedValue(createNotFoundError("Trade"));

    const request = new NextRequest(`http://localhost:3000/api/trades/${TRADE_A}`, {
      method: "DELETE",
    });

    const route = await import("./[id]/route");
    const response = await route.DELETE(request, { params: { id: TRADE_A } });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireServerUserId.mockRejectedValue(createAuthRequiredError());

    const request = new NextRequest(`http://localhost:3000/api/trades/${TRADE_A}`, {
      method: "DELETE",
    });

    const route = await import("./[id]/route");
    const response = await route.DELETE(request, { params: { id: TRADE_A } });

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});