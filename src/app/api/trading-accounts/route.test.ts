/**
 * Trading Account API — Route Integration Tests
 *
 * Tests Next.js App Router trading account API endpoints:
 *   - src/app/api/trading-accounts/route.ts (POST, GET)
 *   - src/app/api/trading-accounts/[id]/route.ts (GET, PATCH, DELETE)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthRequiredError,
  createDatabaseError,
  createNotFoundError,
  createValidationError,
} from "@/lib/trading/trade/errors";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateTradingAccount = vi.fn();
const mockListTradingAccounts = vi.fn();
const mockGetTradingAccountById = vi.fn();
const mockUpdateTradingAccount = vi.fn();
const mockDeleteTradingAccount = vi.fn();

vi.mock("@/lib/trading/account/service", () => ({
  createTradingAccount: (...args: unknown[]) => mockCreateTradingAccount(...args),
  listTradingAccounts: (...args: unknown[]) => mockListTradingAccounts(...args),
  getTradingAccountById: (...args: unknown[]) => mockGetTradingAccountById(...args),
  updateTradingAccount: (...args: unknown[]) => mockUpdateTradingAccount(...args),
  deleteTradingAccount: (...args: unknown[]) => mockDeleteTradingAccount(...args),
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

const validCreateInput = {
  name: "Main Trading Account",
  type: "PAPER_TRADING",
  currency: "USD",
  initialBalance: "10000.00",
};

const validUpdateInput = { name: "Updated Account Name" };

/**
 * Simulates Next.js App Router request dispatching across exported route handlers.
 * Verifies that unexported HTTP methods return 405 Method Not Allowed with an `Allow` header.
 */
async function dispatchRouteRequest(
  routeModule: Record<string, unknown>,
  request: NextRequest,
  params?: { id: string },
): Promise<NextResponse> {
  const method = request.method.toUpperCase();
  const handler = routeModule[method];

  if (typeof handler === "function") {
    return (handler as Function)(request, { params });
  }

  const supportedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].filter(
    (m) => typeof routeModule[m] === "function",
  );

  return new NextResponse(null, {
    status: 405,
    headers: {
      Allow: supportedMethods.join(", "),
      "Cache-Control": "no-store",
    },
  });
}

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireServerUserId.mockResolvedValue(USER_A);
});

// ---------------------------------------------------------------------------
// Unsupported Methods & 405 Verification
// ---------------------------------------------------------------------------

describe("TradingAccount API — Unsupported HTTP Method Verification (405)", () => {
  it("returns 405 with Allow header for unsupported methods on /api/trading-accounts", async () => {
    const route = await import("./route");

    const putRequest = new NextRequest("http://localhost:3000/api/trading-accounts", { method: "PUT" });
    const response = await dispatchRouteRequest(route, putRequest);

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, POST");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 405 with Allow header for unsupported methods on /api/trading-accounts/[id]", async () => {
    const route = await import("./[id]/route");

    const postRequest = new NextRequest(`http://localhost:3000/api/trading-accounts/${ACCOUNT_A}`, { method: "POST" });
    const response = await dispatchRouteRequest(route, postRequest, { id: ACCOUNT_A });

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, PATCH, DELETE");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

// ---------------------------------------------------------------------------
// POST /api/trading-accounts
// ---------------------------------------------------------------------------

describe("POST /api/trading-accounts", () => {
  it("returns 201 when trading account is created successfully", async () => {
    const mockAccount = { id: ACCOUNT_A, userId: USER_A, ...validCreateInput };
    mockCreateTradingAccount.mockResolvedValue(mockAccount);

    const request = new NextRequest("http://localhost:3000/api/trading-accounts", {
      method: "POST",
      body: JSON.stringify(validCreateInput),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./route");
    const response = await route.POST(request);

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(mockAccount);
    expect(mockCreateTradingAccount).toHaveBeenCalledWith(validCreateInput);
  });

  it("returns 401 when user is unauthenticated", async () => {
    mockRequireServerUserId.mockRejectedValue(new Error("Unauthorized"));

    const request = new NextRequest("http://localhost:3000/api/trading-accounts", {
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
    const request = new NextRequest("http://localhost:3000/api/trading-accounts", {
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
    mockCreateTradingAccount.mockRejectedValue(
      createValidationError([{ path: "name", message: "name is required" }]),
    );

    const request = new NextRequest("http://localhost:3000/api/trading-accounts", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./route");
    const response = await route.POST(request);

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION",
        fieldErrors: [{ path: "name", message: "name is required" }],
      },
    });
  });

  it("returns 400 when request body contains unknown fields or userId injection", async () => {
    mockCreateTradingAccount.mockRejectedValue(
      createValidationError([
        { path: "userId", message: "Unknown field: userId" },
        { path: "unknownProp", message: "Unknown field: unknownProp" },
      ]),
    );

    const request = new NextRequest("http://localhost:3000/api/trading-accounts", {
      method: "POST",
      body: JSON.stringify({ ...validCreateInput, userId: "hacked-user-id", unknownProp: "val" }),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./route");
    const response = await route.POST(request);

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION",
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({ path: "userId", message: "Unknown field: userId" }),
          expect.objectContaining({ path: "unknownProp", message: "Unknown field: unknownProp" }),
        ]),
      },
    });
  });

  it("returns 500 when database error occurs without leaking details", async () => {
    mockCreateTradingAccount.mockRejectedValue(
      createDatabaseError(new Error("Internal Prisma error")),
    );

    const request = new NextRequest("http://localhost:3000/api/trading-accounts", {
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
  });
});

// ---------------------------------------------------------------------------
// GET /api/trading-accounts
// ---------------------------------------------------------------------------

describe("GET /api/trading-accounts", () => {
  it("returns 200 with list of user trading accounts", async () => {
    const listResult = {
      items: [{ id: ACCOUNT_A, name: "Main Trading Account" }],
      total: 1,
      page: 1,
      pageSize: 50,
    };
    mockListTradingAccounts.mockResolvedValue(listResult);

    const request = new NextRequest(
      "http://localhost:3000/api/trading-accounts?page=1&pageSize=50&isActive=true&currency=USD",
      { method: "GET" },
    );

    const route = await import("./route");
    const response = await route.GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(listResult);
    expect(mockListTradingAccounts).toHaveBeenCalledWith({
      filters: { isActive: true, currency: "USD" },
      sort: { field: "createdAt", direction: "desc" },
      pagination: { page: 1, pageSize: 50 },
    });
  });

  it("returns 400 on malformed pagination parameters", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/trading-accounts?page=-1",
      { method: "GET" },
    );

    const route = await import("./route");
    const response = await route.GET(request);

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireServerUserId.mockRejectedValue(new Error("Unauthorized"));

    const request = new NextRequest("http://localhost:3000/api/trading-accounts", {
      method: "GET",
    });

    const route = await import("./route");
    const response = await route.GET(request);

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

// ---------------------------------------------------------------------------
// GET /api/trading-accounts/[id]
// ---------------------------------------------------------------------------

describe("GET /api/trading-accounts/[id]", () => {
  it("returns 200 when own account exists", async () => {
    const mockAccount = { id: ACCOUNT_A, userId: USER_A, name: "Main Trading Account" };
    mockGetTradingAccountById.mockResolvedValue(mockAccount);

    const request = new NextRequest(`http://localhost:3000/api/trading-accounts/${ACCOUNT_A}`, {
      method: "GET",
    });

    const route = await import("./[id]/route");
    const response = await route.GET(request, { params: { id: ACCOUNT_A } });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(mockAccount);
    expect(mockGetTradingAccountById).toHaveBeenCalledWith(ACCOUNT_A);
  });

  it("returns 404 when account does not exist or belongs to another user", async () => {
    mockGetTradingAccountById.mockRejectedValue(createNotFoundError("TradingAccount"));

    const request = new NextRequest(`http://localhost:3000/api/trading-accounts/${ACCOUNT_A}`, {
      method: "GET",
    });

    const route = await import("./[id]/route");
    const response = await route.GET(request, { params: { id: ACCOUNT_A } });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: { code: "NOT_FOUND", message: "TradingAccount not found" },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireServerUserId.mockRejectedValue(createAuthRequiredError());

    const request = new NextRequest(`http://localhost:3000/api/trading-accounts/${ACCOUNT_A}`, {
      method: "GET",
    });

    const route = await import("./[id]/route");
    const response = await route.GET(request, { params: { id: ACCOUNT_A } });

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/trading-accounts/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/trading-accounts/[id]", () => {
  it("returns 200 when account is updated successfully", async () => {
    const updatedAccount = { id: ACCOUNT_A, name: "Updated Account Name" };
    mockUpdateTradingAccount.mockResolvedValue(updatedAccount);

    const request = new NextRequest(`http://localhost:3000/api/trading-accounts/${ACCOUNT_A}`, {
      method: "PATCH",
      body: JSON.stringify(validUpdateInput),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./[id]/route");
    const response = await route.PATCH(request, { params: { id: ACCOUNT_A } });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(updatedAccount);
    expect(mockUpdateTradingAccount).toHaveBeenCalledWith(ACCOUNT_A, validUpdateInput);
  });

  it("returns 400 when PATCH body contains unknown fields or userId injection", async () => {
    mockUpdateTradingAccount.mockRejectedValue(
      createValidationError([
        { path: "userId", message: "Unknown field: userId" },
        { path: "unknownProp", message: "Unknown field: unknownProp" },
      ]),
    );

    const request = new NextRequest(`http://localhost:3000/api/trading-accounts/${ACCOUNT_A}`, {
      method: "PATCH",
      body: JSON.stringify({ ...validUpdateInput, userId: "hacked-user-id", unknownProp: "val" }),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./[id]/route");
    const response = await route.PATCH(request, { params: { id: ACCOUNT_A } });

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION",
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({ path: "userId", message: "Unknown field: userId" }),
          expect.objectContaining({ path: "unknownProp", message: "Unknown field: unknownProp" }),
        ]),
      },
    });
  });

  it("returns 400 when request body is malformed JSON", async () => {
    const request = new NextRequest(`http://localhost:3000/api/trading-accounts/${ACCOUNT_A}`, {
      method: "PATCH",
      body: "not-json{",
      headers: { "content-type": "application/json" },
    });

    const route = await import("./[id]/route");
    const response = await route.PATCH(request, { params: { id: ACCOUNT_A } });

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 404 when account does not exist or belongs to another user", async () => {
    mockUpdateTradingAccount.mockRejectedValue(createNotFoundError("TradingAccount"));

    const request = new NextRequest(`http://localhost:3000/api/trading-accounts/${ACCOUNT_A}`, {
      method: "PATCH",
      body: JSON.stringify(validUpdateInput),
      headers: { "content-type": "application/json" },
    });

    const route = await import("./[id]/route");
    const response = await route.PATCH(request, { params: { id: ACCOUNT_A } });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/trading-accounts/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/trading-accounts/[id]", () => {
  it("returns 204 when account is deleted successfully", async () => {
    mockDeleteTradingAccount.mockResolvedValue(undefined);

    const request = new NextRequest(`http://localhost:3000/api/trading-accounts/${ACCOUNT_A}`, {
      method: "DELETE",
    });

    const route = await import("./[id]/route");
    const response = await route.DELETE(request, { params: { id: ACCOUNT_A } });

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mockDeleteTradingAccount).toHaveBeenCalledWith(ACCOUNT_A);
  });

  it("returns 404 when account does not exist or belongs to another user", async () => {
    mockDeleteTradingAccount.mockRejectedValue(createNotFoundError("TradingAccount"));

    const request = new NextRequest(`http://localhost:3000/api/trading-accounts/${ACCOUNT_A}`, {
      method: "DELETE",
    });

    const route = await import("./[id]/route");
    const response = await route.DELETE(request, { params: { id: ACCOUNT_A } });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireServerUserId.mockRejectedValue(createAuthRequiredError());

    const request = new NextRequest(`http://localhost:3000/api/trading-accounts/${ACCOUNT_A}`, {
      method: "DELETE",
    });

    const route = await import("./[id]/route");
    const response = await route.DELETE(request, { params: { id: ACCOUNT_A } });

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
