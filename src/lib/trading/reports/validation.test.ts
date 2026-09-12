import { describe, expect, it } from "vitest";
import { validateReportFilterInput } from "./validation";

describe("Reports Validation", () => {
  it("passes with empty or undefined filter", () => {
    expect(validateReportFilterInput(undefined).isValid).toBe(true);
    expect(validateReportFilterInput({}).isValid).toBe(true);
  });

  it("passes with valid filter options", () => {
    const res = validateReportFilterInput({
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
      symbol: "NVDA",
      side: "LONG",
      status: "CLOSED",
      tradingAccountId: "acc-1",
      strategyId: "strat-1",
      setupId: "setup-1",
      tagId: "tag-1",
      mistakeId: "mistake-1",
    });

    expect(res.isValid).toBe(true);
    expect(res.sanitizedFilter?.symbol).toBe("NVDA");
    expect(res.sanitizedFilter?.side).toBe("LONG");
    expect(res.sanitizedFilter?.status).toBe("CLOSED");
  });

  it("rejects unknown or client-injected fields (e.g. userId injection)", () => {
    const res = validateReportFilterInput({
      userId: "injected-user-id",
    });

    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("userId");
  });

  it("rejects invalid date range where dateTo is earlier than dateFrom", () => {
    const res = validateReportFilterInput({
      dateFrom: "2026-05-01",
      dateTo: "2026-04-01",
    });

    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("dateTo");
  });
});
