/**
 * Trading Account API — Error Handler Tests
 */

import { describe, expect, it } from "vitest";

import { handleTradingAccountApiError } from "./handler";
import { TradeServiceError } from "@/lib/trading/trade/errors";

describe("handleTradingAccountApiError", () => {
  it("returns 400 for VALIDATION errors with fieldErrors and Cache-Control", async () => {
    const err = new TradeServiceError({
      code: "VALIDATION",
      message: "name is required",
      httpStatus: 400,
      fieldErrors: [{ path: "name", message: "name is required" }],
    });

    const response = handleTradingAccountApiError(err);
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION",
        message: "name is required",
        fieldErrors: [{ path: "name", message: "name is required" }],
      },
    });
  });

  it("returns 401 for AUTH_REQUIRED errors", async () => {
    const err = new TradeServiceError({
      code: "AUTH_REQUIRED",
      message: "Authentication required",
      httpStatus: 401,
    });

    const response = handleTradingAccountApiError(err);
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: { code: "AUTH_REQUIRED", message: "Authentication required" },
    });
  });

  it("returns 404 for NOT_FOUND errors", async () => {
    const err = new TradeServiceError({
      code: "NOT_FOUND",
      message: "TradingAccount not found",
      httpStatus: 404,
    });

    const response = handleTradingAccountApiError(err);
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: { code: "NOT_FOUND", message: "TradingAccount not found" },
    });
  });

  it("returns 500 for generic unexpected errors", async () => {
    const response = handleTradingAccountApiError(new Error("Unexpected DB crash"));
    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: {
        code: "INTERNAL_ERROR",
        message: "An internal error occurred. Please try again later.",
      },
    });
  });
});
