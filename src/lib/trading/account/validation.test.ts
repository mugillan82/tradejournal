/**
 * Trading Account Domain — Validation Tests
 *
 * Direct unit tests for validateCreateTradingAccountInput and
 * validateUpdateTradingAccountInput.
 */

import { describe, expect, it } from "vitest";
import {
  validateCreateTradingAccountInput,
  validateUpdateTradingAccountInput,
} from "./validation";

describe("validateCreateTradingAccountInput", () => {
  it("passes with valid minimum fields", () => {
    const result = validateCreateTradingAccountInput({
      name: "Main Account",
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("passes with all valid optional fields", () => {
    const result = validateCreateTradingAccountInput({
      name: "Main Account",
      type: "LIVE",
      currency: "EUR",
      initialBalance: "5000.00",
      currentBalance: "5200.50",
      isActive: true,
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects missing name", () => {
    const result = validateCreateTradingAccountInput({
      type: "LIVE",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "name", message: "name is required" }),
      ]),
    );
  });

  it("rejects unknown fields (e.g. userId injection)", () => {
    const result = validateCreateTradingAccountInput({
      name: "Main Account",
      userId: "hacked-user-id",
      arbitraryProp: "value",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "userId", message: "Unknown field: userId" }),
        expect.objectContaining({ path: "arbitraryProp", message: "Unknown field: arbitraryProp" }),
      ]),
    );
  });

  it("rejects invalid currency format", () => {
    const result = validateCreateTradingAccountInput({
      name: "Main Account",
      currency: "usd", // must be uppercase
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "currency" }),
      ]),
    );
  });

  it("rejects negative initial balance", () => {
    const result = validateCreateTradingAccountInput({
      name: "Main Account",
      initialBalance: "-100.00",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "initialBalance", message: "initialBalance cannot be negative" }),
      ]),
    );
  });
});

describe("validateUpdateTradingAccountInput", () => {
  it("passes with valid partial update", () => {
    const result = validateUpdateTradingAccountInput({
      name: "Updated Name",
    });
    expect(result.isValid).toBe(true);
  });

  it("rejects empty update object", () => {
    const result = validateUpdateTradingAccountInput({});
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toBe("At least one field must be provided for update");
  });

  it("rejects unknown fields on update (e.g. userId injection)", () => {
    const result = validateUpdateTradingAccountInput({
      name: "Updated Name",
      userId: "hacked-user-id",
      unknownField: "foo",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "userId", message: "Unknown field: userId" }),
        expect.objectContaining({ path: "unknownField", message: "Unknown field: unknownField" }),
      ]),
    );
  });
});
