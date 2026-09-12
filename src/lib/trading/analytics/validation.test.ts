/**
 * Analytics Domain — Validation Tests
 */

import { describe, expect, it } from "vitest";
import { validateAnalyticsFilterInput } from "./validation";

describe("Analytics Validation", () => {
  it("passes with empty or undefined filter", () => {
    const res1 = validateAnalyticsFilterInput(undefined);
    expect(res1.isValid).toBe(true);
    expect(res1.errors).toHaveLength(0);
    expect(res1.sanitizedFilter).toEqual({});

    const res2 = validateAnalyticsFilterInput({});
    expect(res2.isValid).toBe(true);
    expect(res2.sanitizedFilter).toEqual({});
  });

  it("passes with valid Date objects and strings", () => {
    const from = new Date("2025-01-01T00:00:00.000Z");
    const to = new Date("2025-01-31T23:59:59.999Z");

    const res = validateAnalyticsFilterInput({
      dateFrom: from,
      dateTo: to,
      symbol: "AAPL",
      side: "LONG",
      status: "CLOSED",
      tradingAccountId: "acc-123",
      strategyId: "strat-1",
      setupId: "setup-1",
      tagId: "tag-1",
      mistakeId: "mistake-1",
    });

    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.sanitizedFilter?.symbol).toBe("AAPL");
    expect(res.sanitizedFilter?.side).toBe("LONG");
    expect(res.sanitizedFilter?.status).toBe("CLOSED");
    expect(res.sanitizedFilter?.dateFrom).toEqual(from);
    expect(res.sanitizedFilter?.dateTo).toEqual(to);
  });

  it("parses ISO date strings into Date objects", () => {
    const res = validateAnalyticsFilterInput({
      dateFrom: "2025-06-01T00:00:00.000Z",
      dateTo: "2025-06-30T00:00:00.000Z",
    });

    expect(res.isValid).toBe(true);
    expect(res.sanitizedFilter?.dateFrom).toBeInstanceOf(Date);
    expect(res.sanitizedFilter?.dateTo).toBeInstanceOf(Date);
  });

  it("rejects non-object inputs", () => {
    const res = validateAnalyticsFilterInput("invalid-string");
    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("filter");
  });

  it("rejects unknown or client-injected fields (e.g. userId injection)", () => {
    const res = validateAnalyticsFilterInput({
      userId: "hacker-user-id",
      symbol: "TSLA",
      arbitraryField: 123,
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.path === "userId")).toBe(true);
    expect(res.errors.some((e) => e.path === "arbitraryField")).toBe(true);
  });

  it("rejects invalid date strings", () => {
    const res = validateAnalyticsFilterInput({
      dateFrom: "not-a-real-date",
    });

    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("dateFrom");
  });

  it("rejects dateTo earlier than dateFrom", () => {
    const res = validateAnalyticsFilterInput({
      dateFrom: "2025-12-01T00:00:00.000Z",
      dateTo: "2025-01-01T00:00:00.000Z",
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.path === "dateTo")).toBe(true);
  });

  it("rejects invalid side and status enums", () => {
    const res = validateAnalyticsFilterInput({
      side: "INVALID_SIDE",
      status: "INVALID_STATUS",
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.path === "side")).toBe(true);
    expect(res.errors.some((e) => e.path === "status")).toBe(true);
  });

  it("rejects empty or whitespace-only string IDs", () => {
    const res = validateAnalyticsFilterInput({
      tradingAccountId: "   ",
      symbol: "",
      strategyId: "",
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.path === "tradingAccountId")).toBe(true);
    expect(res.errors.some((e) => e.path === "symbol")).toBe(true);
    expect(res.errors.some((e) => e.path === "strategyId")).toBe(true);
  });
});
