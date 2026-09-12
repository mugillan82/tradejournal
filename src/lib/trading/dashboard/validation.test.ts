import { describe, it, expect } from "vitest";
import { validateDashboardFilterInput } from "./validation";

describe("Dashboard Validation", () => {
  it("passes with empty or undefined filter", () => {
    const r1 = validateDashboardFilterInput(undefined);
    expect(r1.isValid).toBe(true);
    expect(r1.sanitizedInput).toEqual({});

    const r2 = validateDashboardFilterInput({});
    expect(r2.isValid).toBe(true);
    expect(r2.sanitizedInput).toEqual({});
  });

  it("passes with valid filter options", () => {
    const res = validateDashboardFilterInput({
      tradingAccountId: "acc-123",
      dateFrom: "2026-01-01T00:00:00.000Z",
      dateTo: "2026-01-31T23:59:59.999Z",
    });

    expect(res.isValid).toBe(true);
    expect(res.sanitizedInput?.tradingAccountId).toBe("acc-123");
    expect(res.sanitizedInput?.dateFrom).toBeInstanceOf(Date);
    expect(res.sanitizedInput?.dateTo).toBeInstanceOf(Date);
  });

  it("rejects unknown or client-injected fields (e.g. userId injection)", () => {
    const res = validateDashboardFilterInput({
      userId: "injected-user-id",
      tradingAccountId: "acc-123",
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.field === "userId")).toBe(true);
  });

  it("rejects invalid date range where dateTo is earlier than dateFrom", () => {
    const res = validateDashboardFilterInput({
      dateFrom: "2026-02-01",
      dateTo: "2026-01-01",
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.field === "dateRange")).toBe(true);
  });
});
