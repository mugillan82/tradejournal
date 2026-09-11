import { describe, it, expect } from "vitest";
import {
  validateCreateJournalEntryInput,
  validateUpdateJournalEntryInput,
  validateCreateTradeNoteInput,
  validateUpdateTradeNoteInput,
  validateCreateReviewInput,
  validateUpdateReviewInput,
  normalizeDateToUtcMidnight,
} from "./validation";

describe("Journal Domain Validation", () => {
  describe("normalizeDateToUtcMidnight", () => {
    it("converts Date and ISO string to UTC midnight", () => {
      const date = normalizeDateToUtcMidnight("2026-05-15T14:30:00Z");
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(4); // 0-indexed May
      expect(date.getUTCDate()).toBe(15);
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
    });

    it("throws on invalid date strings", () => {
      expect(() => normalizeDateToUtcMidnight("invalid-date")).toThrow();
    });
  });

  describe("validateCreateJournalEntryInput", () => {
    it("passes with valid minimum fields", () => {
      const res = validateCreateJournalEntryInput({
        entryDate: "2026-05-15",
      });
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("passes with valid mood, energy, and focus", () => {
      const res = validateCreateJournalEntryInput({
        entryDate: "2026-05-15",
        mood: "VERY_GOOD",
        energy: 8,
        focus: 9,
        notes: "Great trading session today.",
      });
      expect(res.isValid).toBe(true);
    });

    it("fails when entryDate is missing", () => {
      const res = validateCreateJournalEntryInput({
        entryDate: "",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "entryDate")).toBe(true);
    });

    it("fails for invalid mood value", () => {
      const res = validateCreateJournalEntryInput({
        entryDate: "2026-05-15",
        // @ts-expect-error testing invalid mood
        mood: "ECSTATIC",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "mood")).toBe(true);
    });

    it("fails when energy or focus is out of 1-10 range", () => {
      const res = validateCreateJournalEntryInput({
        entryDate: "2026-05-15",
        energy: 15,
        focus: 0,
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "energy")).toBe(true);
      expect(res.errors.some((e) => e.path === "focus")).toBe(true);
    });
  });

  describe("validateCreateTradeNoteInput", () => {
    it("passes with valid tradeId and content", () => {
      const res = validateCreateTradeNoteInput({
        tradeId: "trade-123",
        content: "Scaled out 50% at 2R target.",
      });
      expect(res.isValid).toBe(true);
    });

    it("fails when content is empty", () => {
      const res = validateCreateTradeNoteInput({
        tradeId: "trade-123",
        content: "   ",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "content")).toBe(true);
    });
  });

  describe("validateCreateReviewInput", () => {
    it("passes with valid review date and trades", () => {
      const res = validateCreateReviewInput({
        title: "Weekly Review",
        reviewDate: "2026-05-15",
        rating: 8,
        notes: "Solid risk discipline.",
        trades: [
          { tradeId: "trade-1", rating: 9, notes: "Executed according to plan" },
        ],
      });
      expect(res.isValid).toBe(true);
    });

    it("fails when tradeId in trades array is missing", () => {
      const res = validateCreateReviewInput({
        reviewDate: "2026-05-15",
        trades: [{ tradeId: "", rating: 5 }],
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path.includes("tradeId"))).toBe(true);
    });
  });

  describe("Update Validators", () => {
    it("validates update journal entry", () => {
      expect(validateUpdateJournalEntryInput({ mood: "VERY_GOOD" }).isValid).toBe(true);
      expect(validateUpdateJournalEntryInput({}).isValid).toBe(false);
    });

    it("validates update trade note", () => {
      expect(validateUpdateTradeNoteInput({ content: "Updated content" }).isValid).toBe(true);
      expect(validateUpdateTradeNoteInput({ content: "" }).isValid).toBe(false);
    });

    it("validates update review", () => {
      expect(validateUpdateReviewInput({ rating: 10 }).isValid).toBe(true);
      expect(validateUpdateReviewInput({}).isValid).toBe(false);
    });
  });
});
