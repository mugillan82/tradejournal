/**
 * Classification Domain — Validation Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  validateCreateTagInput,
  validateUpdateTagInput,
  validateCreateStrategyInput,
  validateUpdateStrategyInput,
  validateCreateSetupInput,
  validateUpdateSetupInput,
  validateCreateMistakeInput,
  validateUpdateMistakeInput,
  validateAssignTradeTagsInput,
  validateAssignTradeMistakesInput,
  validateAssignTradeStrategyInput,
  validateAssignTradeSetupInput,
} from "./validation";

describe("Classification Domain Validation", () => {
  describe("Tag Validation", () => {
    it("validates create tag input with name and color", () => {
      const res = validateCreateTagInput({ name: "Breakout", color: "#10b981" });
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("rejects create tag input without name", () => {
      const res = validateCreateTagInput({ name: "" });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "name")).toBe(true);
    });

    it("rejects invalid color format", () => {
      const res = validateCreateTagInput({ name: "Breakout", color: "invalid#hex12345" });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "color")).toBe(true);
    });

    it("rejects unknown fields on tag creation (e.g. userId injection)", () => {
      const res = validateCreateTagInput({ name: "Breakout", userId: "evil_user" });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "userId")).toBe(true);
    });

    it("validates update tag input", () => {
      const res = validateUpdateTagInput({ name: "Updated Tag" });
      expect(res.isValid).toBe(true);
    });

    it("rejects empty update tag input", () => {
      const res = validateUpdateTagInput({});
      expect(res.isValid).toBe(false);
    });
  });

  describe("Strategy Validation", () => {
    it("validates create strategy input with description", () => {
      const res = validateCreateStrategyInput({
        name: "Trend Momentum",
        description: "50 EMA crossover on 15m timeframe",
      });
      expect(res.isValid).toBe(true);
    });

    it("rejects missing strategy name", () => {
      const res = validateCreateStrategyInput({ name: "   " });
      expect(res.isValid).toBe(false);
      expect(res.errors[0].path).toBe("name");
    });

    it("rejects unknown fields on strategy update", () => {
      const res = validateUpdateStrategyInput({ name: "New Name", maliciousField: true });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "maliciousField")).toBe(true);
    });
  });

  describe("Setup Validation", () => {
    it("validates create setup input", () => {
      const res = validateCreateSetupInput({
        name: "Bull Flag Breakout",
        description: "High volume continuation pattern",
      });
      expect(res.isValid).toBe(true);
    });

    it("rejects empty setup name", () => {
      const res = validateCreateSetupInput({ name: "" });
      expect(res.isValid).toBe(false);
    });

    it("validates update setup input", () => {
      const res = validateUpdateSetupInput({ name: "Updated Setup" });
      expect(res.isValid).toBe(true);
    });
  });

  describe("Mistake Validation", () => {
    it("validates create mistake input", () => {
      const res = validateCreateMistakeInput({
        name: "FOMO Entry",
        description: "Entered after 3 large green candles without pullback",
      });
      expect(res.isValid).toBe(true);
    });

    it("rejects empty mistake name", () => {
      const res = validateCreateMistakeInput({ name: "" });
      expect(res.isValid).toBe(false);
    });

    it("validates update mistake input", () => {
      const res = validateUpdateMistakeInput({ description: "Updated rule" });
      expect(res.isValid).toBe(true);
    });
  });


  describe("Trade Association Validation", () => {
    it("validates assign tags array", () => {
      const res = validateAssignTradeTagsInput({ tagIds: ["tag_1", "tag_2"] });
      expect(res.isValid).toBe(true);
    });

    it("rejects non-array tagIds", () => {
      const res = validateAssignTradeTagsInput({ tagIds: "tag_1" });
      expect(res.isValid).toBe(false);
    });

    it("rejects empty string in tagIds", () => {
      const res = validateAssignTradeTagsInput({ tagIds: ["tag_1", "  "] });
      expect(res.isValid).toBe(false);
    });

    it("validates assign mistakes array", () => {
      const res = validateAssignTradeMistakesInput({ mistakeIds: ["mistake_1"] });
      expect(res.isValid).toBe(true);
    });

    it("validates assign strategy input with null (clear strategy)", () => {
      const res = validateAssignTradeStrategyInput({ strategyId: null });
      expect(res.isValid).toBe(true);
    });

    it("validates assign setup input with null (clear setup)", () => {
      const res = validateAssignTradeSetupInput({ setupId: null });
      expect(res.isValid).toBe(true);
    });
  });
});
