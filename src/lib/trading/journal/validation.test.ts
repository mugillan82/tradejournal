import { describe, it, expect } from "vitest";
import {
  validateCreateJournalEntryInput,
  validateUpdateJournalEntryInput,
  validateCreateNotebookNoteInput,
  validateUpdateNotebookNoteInput,
  validateCreateTradeNoteInput,
  validateUpdateTradeNoteInput,
  validateCreateReviewTemplateInput,
  validateUpdateReviewTemplateInput,
  validateCreateReviewInput,
  validateUpdateReviewInput,
  validateReviewStatusTransition,
  sanitizeTextContent,
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

  describe("sanitizeTextContent", () => {
    it("strips harmful HTML tags, scripts, and javascript: links", () => {
      expect(sanitizeTextContent("<script>alert('xss')</script>Hello")).toBe("Hello");
      expect(sanitizeTextContent("<img src=x onerror=alert(1)>")).not.toContain("onerror=");
      expect(sanitizeTextContent("<a href=\"javascript:void(0)\">Link</a>")).not.toContain("javascript:");
    });

    it("preserves safe plain text and markdown characters", () => {
      const safe = "## Market Analysis\n- Invalidation at **$150.25**\n- Risk: 1.5R";
      expect(sanitizeTextContent(safe)).toBe(safe);
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

    it("passes with valid mood, energy, focus, tags, and trades", () => {
      const res = validateCreateJournalEntryInput({
        entryDate: "2026-05-15",
        title: "Morning Open Discipline",
        mood: "VERY_GOOD",
        energy: 8,
        focus: 9,
        notes: "Great trading session today.",
        tagIds: ["tag-1", "tag-2"],
        tradeIds: ["trade-1"],
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

  describe("validateCreateNotebookNoteInput", () => {
    it("passes with valid title and content", () => {
      const res = validateCreateNotebookNoteInput({
        title: "Key Level Thesis",
        content: "Testing bounce from 200 EMA on 4h chart",
        strategyId: "strat-1",
        tagIds: ["tag-1"],
      });
      expect(res.isValid).toBe(true);
    });

    it("fails when title or content is empty", () => {
      const res = validateCreateNotebookNoteInput({
        title: "   ",
        content: "",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "title")).toBe(true);
      expect(res.errors.some((e) => e.path === "content")).toBe(true);
    });
  });

  describe("validateCreateReviewTemplateInput", () => {
    it("passes with valid name and prompts array", () => {
      const res = validateCreateReviewTemplateInput({
        name: "Weekly Retrospective",
        description: "Review of weekly adherence and R-multiple",
        prompts: ["Best execution of week", "Worst mistake of week"],
      });
      expect(res.isValid).toBe(true);
    });

    it("fails when prompts array is empty", () => {
      const res = validateCreateReviewTemplateInput({
        name: "Empty Template",
        prompts: [],
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "prompts")).toBe(true);
    });
  });

  describe("validateCreateTradeNoteInput", () => {
    it("passes with valid tradeId, content, and phase", () => {
      const res = validateCreateTradeNoteInput({
        tradeId: "trade-123",
        content: "Scaled out 50% at 2R target.",
        phase: "MANAGEMENT",
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

    it("fails when phase is invalid", () => {
      const res = validateCreateTradeNoteInput({
        tradeId: "trade-123",
        content: "Note",
        // @ts-expect-error invalid phase
        phase: "INVALID_PHASE",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "phase")).toBe(true);
    });
  });

  describe("validateCreateReviewInput", () => {
    it("passes with valid review date, retrospective sections, and trades", () => {
      const res = validateCreateReviewInput({
        title: "Weekly Review",
        reviewDate: "2026-05-15",
        status: "DRAFT",
        thesis: "Breakout continuation",
        whatWentWell: "Followed stop loss",
        whatWentWrong: "Chased entry slightly",
        executionQuality: 8,
        ruleAdherence: 9,
        riskManagement: 10,
        emotionalObservations: "No stress",
        lessonsLearned: "Patience pays",
        improvementActions: "Wait for candle close",
        rating: 8,
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

    it("fails when executionQuality or ruleAdherence is out of range", () => {
      const res = validateCreateReviewInput({
        reviewDate: "2026-05-15",
        executionQuality: 15,
        ruleAdherence: -1,
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "executionQuality")).toBe(true);
      expect(res.errors.some((e) => e.path === "ruleAdherence")).toBe(true);
    });
  });

  describe("validateReviewStatusTransition", () => {
    it("allows valid transitions", () => {
      expect(validateReviewStatusTransition("DRAFT", "IN_REVIEW").isValid).toBe(true);
      expect(validateReviewStatusTransition("IN_REVIEW", "COMPLETED").isValid).toBe(true);
      expect(validateReviewStatusTransition("COMPLETED", "IN_REVIEW").isValid).toBe(true);
      expect(validateReviewStatusTransition("DRAFT", "DRAFT").isValid).toBe(true);
    });

    it("rejects invalid status transitions", () => {
      // @ts-expect-error invalid next status
      const res = validateReviewStatusTransition("DRAFT", "ARCHIVED");
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.path === "status")).toBe(true);
    });
  });

  describe("Update Validators", () => {
    it("validates update journal entry", () => {
      expect(validateUpdateJournalEntryInput({ mood: "VERY_GOOD" }).isValid).toBe(true);
      expect(validateUpdateJournalEntryInput({}).isValid).toBe(false);
    });

    it("validates update notebook note", () => {
      expect(validateUpdateNotebookNoteInput({ title: "Updated" }).isValid).toBe(true);
      expect(validateUpdateNotebookNoteInput({}).isValid).toBe(false);
    });

    it("validates update review template", () => {
      expect(validateUpdateReviewTemplateInput({ name: "Updated" }).isValid).toBe(true);
      expect(validateUpdateReviewTemplateInput({}).isValid).toBe(false);
    });

    it("validates update trade note", () => {
      expect(validateUpdateTradeNoteInput({ content: "Updated content", phase: "EXIT" }).isValid).toBe(true);
      expect(validateUpdateTradeNoteInput({ content: "" }).isValid).toBe(false);
      expect(validateUpdateTradeNoteInput({}).isValid).toBe(false);
    });

    it("validates update review", () => {
      expect(validateUpdateReviewInput({ rating: 10 }).isValid).toBe(true);
      expect(validateUpdateReviewInput({ status: "COMPLETED" }).isValid).toBe(true);
      expect(validateUpdateReviewInput({}).isValid).toBe(false);
    });
  });
});
