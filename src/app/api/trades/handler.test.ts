/**
 * Trade API — Error Handler Tests
 *
 * Tests the shared error handler that converts TradeServiceError
 * into structured JSON HTTP responses.
 */

import { describe, expect, it } from "vitest";

import { handleTradeApiError } from "./handler";
import { TradeServiceError } from "../../../lib/trading/trade/errors";

// ---------------------------------------------------------------------------
// TradeServiceError cases
// ---------------------------------------------------------------------------

describe("handleTradeApiError — TradeServiceError", () => {
  it("returns 400 for VALIDATION errors", async () => {
    const err = new TradeServiceError({
      code: "VALIDATION",
      message: "quantity must be positive",
      httpStatus: 400,
    });

    const response = handleTradeApiError(err);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION",
        message: "quantity must be positive",
      },
    });
  });

  it("returns 401 for AUTH_REQUIRED errors", async () => {
    const err = new TradeServiceError({
      code: "AUTH_REQUIRED",
      message: "Authentication required",
      httpStatus: 401,
    });

    const response = handleTradeApiError(err);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: {
        code: "AUTH_REQUIRED",
        message: "Authentication required",
      },
    });
  });

  it("returns 404 for NOT_FOUND errors", async () => {
    const err = new TradeServiceError({
      code: "NOT_FOUND",
      message: "Trade not found",
      httpStatus: 404,
    });

    const response = handleTradeApiError(err);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "Trade not found",
      },
    });
  });

  it("returns 403 for FORBIDDEN errors", async () => {
    const err = new TradeServiceError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource",
      httpStatus: 403,
    });

    const response = handleTradeApiError(err);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource",
      },
    });
  });

  it("returns 500 for DATABASE_ERROR", async () => {
    const err = new TradeServiceError({
      code: "DATABASE_ERROR",
      message: "An internal error occurred. Please try again later.",
      httpStatus: 500,
    });

    const response = handleTradeApiError(err);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: {
        code: "DATABASE_ERROR",
        message: "An internal error occurred. Please try again later.",
      },
    });
  });

  it("includes fieldErrors in the response", async () => {
    const err = new TradeServiceError({
      code: "VALIDATION",
      message: "2 validation error(s)",
      httpStatus: 400,
      fieldErrors: [
        { path: "quantity", message: "quantity must be positive" },
        { path: "entryPrice", message: "entryPrice must be a positive number" },
      ],
    });

    const response = handleTradeApiError(err);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        fieldErrors: [
          { path: "quantity", message: "quantity must be positive" },
          { path: "entryPrice", message: "entryPrice must be a positive number" },
        ],
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Unknown error cases
// ---------------------------------------------------------------------------

describe("handleTradeApiError — unknown errors", () => {
  it("returns 500 for a generic Error", async () => {
    const response = handleTradeApiError(new Error("Something unexpected"));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: {
        code: "INTERNAL_ERROR",
        message: "An internal error occurred. Please try again later.",
      },
    });
  });

  it("returns 500 for a string error", async () => {
    const response = handleTradeApiError("something went wrong");
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: {
        code: "INTERNAL_ERROR",
      },
    });
  });

  it("returns 500 for null", async () => {
    const response = handleTradeApiError(null);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: {
        code: "INTERNAL_ERROR",
      },
    });
  });
});