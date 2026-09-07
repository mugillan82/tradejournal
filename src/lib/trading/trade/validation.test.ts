/**
 * Trade Domain — Validation Unit Tests
 *
 * Tests domain validation rules derived from the Prisma schema
 * and domain logic. These are pure unit tests — no database required.
 *
 * Covered scenarios:
 * - valid trade
 * - invalid quantity (zero, negative, non-numeric, too many decimals)
 * - invalid price (zero, negative, non-numeric)
 * - invalid date ordering (exitDate before entryDate)
 * - invalid closed/open state (closed without exit data)
 * - valid update input
 * - invalid update input
 */

import { describe, expect, it } from "vitest";
import {
  validateCreateTradeInput,
  validateMergedTradeShape,
  validateUpdateTradeInput,
} from "./validation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidCreateTrade() {
  return {
    tradingAccountId: "acc-123",
    side: "LONG" as const,
    entryPrice: "100.50",
    entryDate: new Date("2024-01-15T09:30:00Z"),
    quantity: "10",
  };
}

// ---------------------------------------------------------------------------
// Valid trade input
// ---------------------------------------------------------------------------

describe("validateCreateTradeInput — valid trade", () => {
  it("passes for a minimal valid open trade", () => {
    const input = makeValidCreateTrade();
    const result = validateCreateTradeInput(input);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("passes for a complete closed trade with all optional fields", () => {
    const result = validateCreateTradeInput({
      tradingAccountId: "acc-123",
      side: "SHORT",
      entryPrice: "150.25",
      entryDate: new Date("2024-01-15T09:30:00Z"),
      exitPrice: "155.00",
      exitDate: new Date("2024-01-16T16:00:00Z"),
      quantity: "5",
      status: "CLOSED",
      stopLoss: "148.00",
      takeProfit: "160.00",
      riskAmount: "11.25",
      plannedRiskReward: "2.0",
      commission: "1.00",
      fees: "0.50",
      swap: "0.10",
      title: "AAPL short",
      notes: "Test trade",
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("passes for an open trade with nullable monetary fields set to null", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      stopLoss: null,
      takeProfit: null,
      riskAmount: null,
      plannedRiskReward: null,
      commission: null,
      fees: null,
      swap: null,
      grossPnl: null,
      netPnl: null,
    });
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Invalid quantity
// ---------------------------------------------------------------------------

describe("validateCreateTradeInput — invalid quantity", () => {
  it("fails when quantity is zero", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      quantity: "0",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "quantity")).toBe(true);
  });

  it("fails when quantity is negative", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      quantity: "-5",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "quantity")).toBe(true);
  });

  it("fails when quantity is non-numeric", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      quantity: "abc",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "quantity")).toBe(true);
  });

  it("fails when quantity has too many decimal places (>8)", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      quantity: "1.123456789",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "quantity")).toBe(true);
  });

  it("fails when quantity is missing", () => {
    const { quantity, ...withoutQuantity } = makeValidCreateTrade();
    void quantity;
    const result = validateCreateTradeInput(withoutQuantity);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "quantity")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Invalid price
// ---------------------------------------------------------------------------

describe("validateCreateTradeInput — invalid price", () => {
  it("fails when entryPrice is zero", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      entryPrice: "0",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "entryPrice")).toBe(true);
  });

  it("fails when entryPrice is negative", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      entryPrice: "-10.00",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "entryPrice")).toBe(true);
  });

  it("fails when entryPrice is non-numeric", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      entryPrice: "invalid",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "entryPrice")).toBe(true);
  });

  it("fails when exitPrice is negative", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      status: "CLOSED",
      exitPrice: "-5.00",
      exitDate: new Date("2024-01-16"),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "exitPrice")).toBe(true);
  });

  it("fails when stopLoss is negative", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      stopLoss: "-5.00",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "stopLoss")).toBe(true);
  });

  it("fails when takeProfit is negative", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      takeProfit: "-5.00",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "takeProfit")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Invalid date ordering
// ---------------------------------------------------------------------------

describe("validateCreateTradeInput — invalid date ordering", () => {
  it("fails when exitDate is before entryDate", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      status: "CLOSED",
      exitPrice: "110.00",
      exitDate: new Date("2024-01-10T09:30:00Z"), // before entryDate
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "exitDate")).toBe(true);
  });

  it("passes when exitDate equals entryDate (same candle)", () => {
    const sameDate = new Date("2024-01-15T09:30:00Z");
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      entryDate: sameDate,
      status: "CLOSED",
      exitPrice: "101.00",
      exitDate: sameDate,
    });
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Invalid closed/open state
// ---------------------------------------------------------------------------

describe("validateCreateTradeInput — invalid closed/open state", () => {
  it("fails when status is CLOSED but exitPrice is missing", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      status: "CLOSED",
      exitDate: new Date("2024-01-16"),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "exitPrice")).toBe(true);
  });

  it("fails when status is CLOSED but exitDate is missing", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      status: "CLOSED",
      exitPrice: "105.00",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "exitDate")).toBe(true);
  });

  it("fails when status is CLOSED but both exitPrice and exitDate are missing", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      status: "CLOSED",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "exitPrice" || e.path === "exitDate")).toBe(true);
  });

  it("passes when status is OPEN with no exit data", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      status: "OPEN",
    });
    expect(result.isValid).toBe(true);
  });

  it("passes when status is CANCELLED without exit data", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      status: "CANCELLED",
    });
    expect(result.isValid).toBe(true);
  });

  it("fails for invalid side value", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      side: "INVALID",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "side")).toBe(true);
  });

  it("fails for invalid status value", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      status: "PENDING",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "status")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Non-negative monetary fields (costs)
// ---------------------------------------------------------------------------

describe("validateCreateTradeInput — monetary non-negativity (costs)", () => {
  it("fails when riskAmount is negative", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      riskAmount: "-10.00",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "riskAmount")).toBe(true);
  });

  it("fails when commission is negative", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      commission: "-1.00",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "commission")).toBe(true);
  });

  it("fails when fees is negative", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      fees: "-0.50",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "fees")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Signed monetary fields (P&L and swap)
// ---------------------------------------------------------------------------

describe("validateCreateTradeInput — signed monetary fields", () => {
  it("accepts a negative grossPnl (losing trade)", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      grossPnl: "-150.75",
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts a negative netPnl (losing trade after costs)", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      netPnl: "-152.25",
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts a negative swap (financing paid)", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      swap: "-0.10",
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts a positive grossPnl (winning trade)", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      grossPnl: "250.00",
    });
    expect(result.isValid).toBe(true);
  });

  it("accepts zero P&L (breakeven trade)", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      grossPnl: "0",
      netPnl: "0",
    });
    expect(result.isValid).toBe(true);
  });

  it("rejects a non-numeric grossPnl", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      grossPnl: "abc",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "grossPnl")).toBe(true);
  });

  it("rejects a non-numeric netPnl", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      netPnl: "xyz",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "netPnl")).toBe(true);
  });

  it("rejects a grossPnl with too many decimal places (>2)", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      grossPnl: "100.123",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "grossPnl")).toBe(true);
  });

  it("rejects a swap with too many decimal places (>2)", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      swap: "-0.1005",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "swap")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Required fields
// ---------------------------------------------------------------------------

describe("validateCreateTradeInput — required fields", () => {
  it("fails when tradingAccountId is missing", () => {
    const { tradingAccountId: _removed, ...without } = makeValidCreateTrade();
    void _removed;
    const result = validateCreateTradeInput(without);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "tradingAccountId")).toBe(true);
  });

  it("fails when side is missing", () => {
    const { side: _removed, ...without } = makeValidCreateTrade();
    void _removed;
    const result = validateCreateTradeInput(without);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "side")).toBe(true);
  });

  it("fails when entryPrice is missing", () => {
    const { entryPrice: _removed, ...without } = makeValidCreateTrade();
    void _removed;
    const result = validateCreateTradeInput(without);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "entryPrice")).toBe(true);
  });

  it("fails when entryDate is missing", () => {
    const { entryDate: _removed, ...without } = makeValidCreateTrade();
    void _removed;
    const result = validateCreateTradeInput(without);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "entryDate")).toBe(true);
  });

  it("fails for completely empty input", () => {
    const result = validateCreateTradeInput({});
    expect(result.isValid).toBe(false);
  });

  it("fails for null input", () => {
    const result = validateCreateTradeInput(null);
    expect(result.isValid).toBe(false);
  });

  it("fails for undefined input", () => {
    const result = validateCreateTradeInput(undefined);
    expect(result.isValid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// String length limits
// ---------------------------------------------------------------------------

describe("validateCreateTradeInput — string length limits", () => {
  it("fails when title exceeds 255 characters", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      title: "A".repeat(256),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "title")).toBe(true);
  });

  it("fails when notes exceed 5000 characters", () => {
    const result = validateCreateTradeInput({
      ...makeValidCreateTrade(),
      notes: "A".repeat(5001),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "notes")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Update validation
// ---------------------------------------------------------------------------

describe("validateUpdateTradeInput", () => {
  it("passes for a partial update with valid quantity", () => {
    const result = validateUpdateTradeInput({ quantity: "20" });
    expect(result.isValid).toBe(true);
  });

  it("passes for updating only the side", () => {
    const result = validateUpdateTradeInput({ side: "SHORT" });
    expect(result.isValid).toBe(true);
  });

  it("passes for updating only the status", () => {
    const result = validateUpdateTradeInput({ status: "CLOSED" });
    expect(result.isValid).toBe(true);
  });

  it("fails for empty update", () => {
    const result = validateUpdateTradeInput({});
    expect(result.isValid).toBe(false);
    expect(result.errors[0]?.path).toBe("");
  });

  it("fails when quantity in update is zero", () => {
    const result = validateUpdateTradeInput({ quantity: "0" });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "quantity")).toBe(true);
  });

  it("fails when price in update is negative", () => {
    const result = validateUpdateTradeInput({ entryPrice: "-100.00" });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "entryPrice")).toBe(true);
  });

  it("fails when exitDate in update is before entryDate", () => {
    const result = validateUpdateTradeInput({
      entryDate: new Date("2024-01-15"),
      exitDate: new Date("2024-01-10"),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "exitDate")).toBe(true);
  });

  it("passes for a complete valid update", () => {
    const result = validateUpdateTradeInput({
      side: "SHORT",
      entryPrice: "200.00",
      quantity: "15",
      status: "OPEN",
      notes: "Updated trade",
    });
    expect(result.isValid).toBe(true);
  });

  it("accepts updating grossPnl to a negative value", () => {
    const result = validateUpdateTradeInput({ grossPnl: "-200.50" });
    expect(result.isValid).toBe(true);
  });

  it("accepts updating netPnl to a negative value", () => {
    const result = validateUpdateTradeInput({ netPnl: "-205.00" });
    expect(result.isValid).toBe(true);
  });

  it("accepts updating swap to a negative value", () => {
    const result = validateUpdateTradeInput({ swap: "-1.25" });
    expect(result.isValid).toBe(true);
  });

  it("rejects a non-numeric grossPnl in update", () => {
    const result = validateUpdateTradeInput({ grossPnl: "bad" });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "grossPnl")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateMergedTradeShape
// ---------------------------------------------------------------------------

describe("validateMergedTradeShape", () => {
  it("passes for a valid open trade", () => {
    const result = validateMergedTradeShape({
      status: "OPEN",
      entryDate: new Date("2024-01-15"),
      exitPrice: null,
      exitDate: null,
    });
    expect(result.isValid).toBe(true);
  });

  it("fails for a closed trade without exitPrice", () => {
    const result = validateMergedTradeShape({
      status: "CLOSED",
      entryDate: new Date("2024-01-15"),
      exitPrice: null,
      exitDate: new Date("2024-01-16"),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "exitPrice")).toBe(true);
  });

  it("fails for a closed trade without exitDate", () => {
    const result = validateMergedTradeShape({
      status: "CLOSED",
      entryDate: new Date("2024-01-15"),
      exitPrice: "105.00",
      exitDate: null,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "exitDate")).toBe(true);
  });

  it("fails when exitDate is before entryDate in merged shape", () => {
    const result = validateMergedTradeShape({
      status: "CLOSED",
      entryDate: new Date("2024-01-15"),
      exitPrice: "105.00",
      exitDate: new Date("2024-01-10"),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.path === "exitDate")).toBe(true);
  });

  it("passes for a complete closed trade", () => {
    const result = validateMergedTradeShape({
      status: "CLOSED",
      entryDate: new Date("2024-01-15"),
      exitPrice: "105.00",
      exitDate: new Date("2024-01-16"),
    });
    expect(result.isValid).toBe(true);
  });
});
