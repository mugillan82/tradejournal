import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSession = vi.hoisted(() => ({ currentUserId: null as string | null }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: async () => {
    if (!mockSession.currentUserId) {
      throw new Error("Unauthorized: authentication required");
    }
    return mockSession.currentUserId;
  },
  getServerUserId: async () => mockSession.currentUserId,
}));

const mockPrismaHolder = vi.hoisted(() => ({
  current: {
    trade: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    journalEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    notebookNote: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tradeNote: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    reviewTemplate: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    review: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
    },
    strategy: {
      findFirst: vi.fn(),
    },
    setup: {
      findFirst: vi.fn(),
    },
    mistake: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/client", () => ({
  get prisma() {
    return mockPrismaHolder.current;
  },
}));

import {
  createJournalEntry,
  getJournalEntryById,
  getJournalEntryByDate,
  listJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
  createNotebookNote,
  listNotebookNotes,
  updateNotebookNote,
  deleteNotebookNote,
  createTradeNote,
  listTradeNotes,
  updateTradeNote,
  deleteTradeNote,
  listReviewTemplates,
  createReviewTemplate,
  updateReviewTemplate,
  deleteReviewTemplate,
  createReview,
  getReviewById,
  updateReviewStatus,
} from "./service";
import { Prisma } from "@prisma/client";

describe("Journal Domain Service", () => {
  const USER_A = "user-a";
  const TRADE_ID = "trade-123";
  const ENTRY_ID = "entry-123";
  const NOTE_ID = "note-123";
  const REVIEW_ID = "review-123";
  const TEMPLATE_ID = "template-123";
  const NOTEBOOK_ID = "notebook-123";

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.currentUserId = USER_A;
  });

  describe("Authentication", () => {
    it("throws AUTH_REQUIRED if user is not authenticated", async () => {
      mockSession.currentUserId = null;

      await expect(listJournalEntries()).rejects.toMatchObject({
        code: "AUTH_REQUIRED",
        httpStatus: 401,
      });
    });
  });

  describe("Daily Journal Entries", () => {
    it("creates a journal entry with tags and trades successfully", async () => {
      mockPrismaHolder.current.journalEntry.findFirst.mockResolvedValueOnce(null);
      mockPrismaHolder.current.tag.findMany.mockResolvedValueOnce([{ id: "tag-1" }]);
      mockPrismaHolder.current.trade.findMany.mockResolvedValueOnce([{ id: TRADE_ID }]);

      mockPrismaHolder.current.journalEntry.create.mockResolvedValueOnce({
        id: ENTRY_ID,
        userId: USER_A,
        entryDate: new Date("2026-05-15T00:00:00Z"),
        title: "Morning Open Discipline",
        mood: "GOOD",
        energy: 8,
        focus: 9,
        notes: "Great session with <script>alert('xss')</script> adherence",
        tags: [{ tag: { id: "tag-1", name: "Discipline", color: "#10b981" } }],
        trades: [
          {
            trade: {
              id: TRADE_ID,
              title: "AAPL",
              side: "LONG",
              status: "CLOSED",
              netPnl: new Prisma.Decimal(250),
              exitDate: new Date("2026-05-15T15:00:00Z"),
            },
          },
        ],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await createJournalEntry({
        entryDate: "2026-05-15",
        title: "Morning Open Discipline",
        mood: "GOOD",
        energy: 8,
        focus: 9,
        notes: "Great session with <script>alert('xss')</script> adherence",
        tagIds: ["tag-1"],
        tradeIds: [TRADE_ID],
      });

      expect(res.id).toBe(ENTRY_ID);
      expect(res.mood).toBe("GOOD");
      expect(res.trades).toHaveLength(1);
      expect(res.trades[0].symbol).toBe("AAPL");
      expect(mockPrismaHolder.current.journalEntry.create).toHaveBeenCalled();
    });

    it("throws CONFLICT if an entry already exists for the date", async () => {
      mockPrismaHolder.current.journalEntry.findFirst.mockResolvedValueOnce({ id: "existing" });

      await expect(
        createJournalEntry({ entryDate: "2026-05-15" }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        httpStatus: 409,
      });
    });

    it("gets entry by date", async () => {
      mockPrismaHolder.current.journalEntry.findFirst.mockResolvedValueOnce({
        id: ENTRY_ID,
        userId: USER_A,
        entryDate: new Date("2026-05-15T00:00:00Z"),
        title: "Date match",
        mood: "GOOD",
        energy: null,
        focus: null,
        notes: null,
        tags: [],
        trades: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await getJournalEntryByDate("2026-05-15");
      expect(res?.id).toBe(ENTRY_ID);
    });

    it("gets entry by ID for owned record", async () => {
      mockPrismaHolder.current.journalEntry.findFirst.mockResolvedValueOnce({
        id: ENTRY_ID,
        userId: USER_A,
        entryDate: new Date("2026-05-15T00:00:00Z"),
        title: null,
        mood: "GOOD",
        energy: null,
        focus: null,
        notes: null,
        tags: [],
        trades: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await getJournalEntryById(ENTRY_ID);
      expect(res.id).toBe(ENTRY_ID);
    });

    it("throws NOT_FOUND if entry belongs to another user", async () => {
      mockPrismaHolder.current.journalEntry.findFirst.mockResolvedValueOnce(null);

      await expect(getJournalEntryById(ENTRY_ID)).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    });

    it("updates and deletes journal entry", async () => {
      mockPrismaHolder.current.journalEntry.findFirst.mockResolvedValue({ id: ENTRY_ID, userId: USER_A });
      mockPrismaHolder.current.journalEntry.update.mockResolvedValueOnce({
        id: ENTRY_ID,
        userId: USER_A,
        entryDate: new Date(),
        title: "Updated",
        mood: "VERY_GOOD",
        energy: 9,
        focus: 9,
        notes: "Updated",
        tags: [],
        trades: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await updateJournalEntry(ENTRY_ID, { mood: "VERY_GOOD" });
      expect(updated.mood).toBe("VERY_GOOD");

      mockPrismaHolder.current.journalEntry.delete.mockResolvedValueOnce({});
      await expect(deleteJournalEntry(ENTRY_ID)).resolves.not.toThrow();
    });
  });

  describe("Notebook Workspace", () => {
    it("creates a notebook note with strategy and tags verification", async () => {
      mockPrismaHolder.current.strategy.findFirst.mockResolvedValueOnce({ id: "strat-1" });
      mockPrismaHolder.current.tag.findMany.mockResolvedValueOnce([{ id: "tag-1" }]);

      mockPrismaHolder.current.notebookNote.create.mockResolvedValueOnce({
        id: NOTEBOOK_ID,
        userId: USER_A,
        title: "ORB Strategy Edge Research",
        content: "Testing break of first 15m candle with volume confirmation",
        isArchived: false,
        strategyId: "strat-1",
        setupId: null,
        strategy: { id: "strat-1", name: "Opening Range Breakout" },
        setup: null,
        tags: [{ tag: { id: "tag-1", name: "Breakout", color: "#6366f1" } }],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const note = await createNotebookNote({
        title: "ORB Strategy Edge Research",
        content: "Testing break of first 15m candle with volume confirmation",
        strategyId: "strat-1",
        tagIds: ["tag-1"],
      });

      expect(note.id).toBe(NOTEBOOK_ID);
      expect(note.title).toBe("ORB Strategy Edge Research");
      expect(note.strategyName).toBe("Opening Range Breakout");
    });

    it("rejects notebook creation if strategyId is invalid or not found", async () => {
      mockPrismaHolder.current.strategy.findFirst.mockResolvedValueOnce(null);

      await expect(
        createNotebookNote({
          title: "Note",
          content: "Content",
          strategyId: "nonexistent-strategy",
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    });

    it("lists, filters, archives and deletes notebook notes", async () => {
      mockPrismaHolder.current.notebookNote.count.mockResolvedValueOnce(1);
      mockPrismaHolder.current.notebookNote.findMany.mockResolvedValueOnce([
        {
          id: NOTEBOOK_ID,
          userId: USER_A,
          title: "Note 1",
          content: "Content 1",
          isArchived: false,
          strategyId: null,
          setupId: null,
          strategy: null,
          setup: null,
          tags: [],
          attachments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const list = await listNotebookNotes({ search: "Note" });
      expect(list.items).toHaveLength(1);

      mockPrismaHolder.current.notebookNote.findFirst.mockResolvedValue({ id: NOTEBOOK_ID, userId: USER_A });
      mockPrismaHolder.current.notebookNote.update.mockResolvedValueOnce({
        id: NOTEBOOK_ID,
        userId: USER_A,
        title: "Note 1",
        content: "Content 1",
        isArchived: true,
        strategyId: null,
        setupId: null,
        strategy: null,
        setup: null,
        tags: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const archived = await updateNotebookNote(NOTEBOOK_ID, { isArchived: true });
      expect(archived.isArchived).toBe(true);

      mockPrismaHolder.current.notebookNote.delete.mockResolvedValueOnce({});
      await expect(deleteNotebookNote(NOTEBOOK_ID)).resolves.not.toThrow();
    });
  });

  describe("Review Templates", () => {
    it("lists templates including system defaults", async () => {
      mockPrismaHolder.current.reviewTemplate.count.mockResolvedValueOnce(3);
      mockPrismaHolder.current.reviewTemplate.findMany.mockResolvedValueOnce([
        {
          id: "def-1",
          userId: null,
          name: "Post-Trade Debrief",
          description: "System template",
          type: "SYSTEM",
          prompts: JSON.stringify(["Did I follow rules?", "What went well?"]),
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const templates = await listReviewTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0].isDefault).toBe(true);
      expect(templates[0].prompts).toContain("Did I follow rules?");
    });

    it("creates a user-owned custom review template", async () => {
      mockPrismaHolder.current.reviewTemplate.create.mockResolvedValueOnce({
        id: TEMPLATE_ID,
        userId: USER_A,
        name: "My Scalping Debrief",
        description: "Focus on slippage and tape reading",
        type: "CUSTOM",
        prompts: JSON.stringify(["Tape reading clarity", "Spread cost acceptable?"]),
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const tpl = await createReviewTemplate({
        name: "My Scalping Debrief",
        description: "Focus on slippage and tape reading",
        prompts: ["Tape reading clarity", "Spread cost acceptable?"],
      });

      expect(tpl.id).toBe(TEMPLATE_ID);
      expect(tpl.prompts).toHaveLength(2);
      expect(tpl.isDefault).toBe(false);
    });

    it("prevents modifying or deleting default templates", async () => {
      mockPrismaHolder.current.reviewTemplate.findFirst.mockResolvedValueOnce(null); // findFirst with isDefault: false returns null

      await expect(
        updateReviewTemplate("def-1", { name: "Hacked Template" }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });

      mockPrismaHolder.current.reviewTemplate.findFirst.mockResolvedValueOnce(null);
      await expect(deleteReviewTemplate("def-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    });
  });

  describe("Trade Notes with Execution Phase", () => {
    it("rejects creating note if trade is not owned", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValueOnce(null);

      await expect(
        createTradeNote({ tradeId: TRADE_ID, content: "Test note" }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    });

    it("creates, lists, updates and deletes notes with execution phases", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValue({ id: TRADE_ID });
      mockPrismaHolder.current.tradeNote.create.mockResolvedValueOnce({
        id: NOTE_ID,
        tradeId: TRADE_ID,
        content: "Stop loss moved to breakeven after +1.5R target reached",
        phase: "MANAGEMENT",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await createTradeNote({
        tradeId: TRADE_ID,
        content: "Stop loss moved to breakeven after +1.5R target reached",
        phase: "MANAGEMENT",
      });
      expect(res.id).toBe(NOTE_ID);
      expect(res.phase).toBe("MANAGEMENT");

      mockPrismaHolder.current.tradeNote.findMany.mockResolvedValueOnce([
        {
          id: NOTE_ID,
          tradeId: TRADE_ID,
          content: "Stop loss moved to breakeven",
          phase: "MANAGEMENT",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const list = await listTradeNotes(TRADE_ID);
      expect(list).toHaveLength(1);

      mockPrismaHolder.current.tradeNote.findFirst.mockResolvedValue({ id: NOTE_ID, tradeId: TRADE_ID });
      mockPrismaHolder.current.tradeNote.update.mockResolvedValueOnce({
        id: NOTE_ID,
        tradeId: TRADE_ID,
        content: "Exit plan verified",
        phase: "EXIT",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const updated = await updateTradeNote(TRADE_ID, NOTE_ID, { phase: "EXIT" });
      expect(updated.phase).toBe("EXIT");

      mockPrismaHolder.current.tradeNote.delete.mockResolvedValueOnce({});
      await expect(deleteTradeNote(TRADE_ID, NOTE_ID)).resolves.not.toThrow();
    });
  });

  describe("Structured Trade Reviews & Workflow", () => {
    it("rejects review creation if associated trade is not owned by user", async () => {
      mockPrismaHolder.current.trade.findMany.mockResolvedValueOnce([]); // 0 trades found out of 1

      await expect(
        createReview({
          reviewDate: "2026-05-15",
          trades: [{ tradeId: "unowned-trade-999" }],
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    });

    it("rejects review creation if mistakeId does not exist", async () => {
      mockPrismaHolder.current.mistake.findMany.mockResolvedValueOnce([]); // 0 mistakes found

      await expect(
        createReview({
          reviewDate: "2026-05-15",
          mistakeIds: ["foreign-mistake-999"],
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    });

    it("validates review status workflow transitions", async () => {
      mockPrismaHolder.current.review.findFirst.mockResolvedValue({
        id: REVIEW_ID,
        userId: USER_A,
        status: "DRAFT",
      });

      mockPrismaHolder.current.review.update.mockResolvedValueOnce({
        id: REVIEW_ID,
        userId: USER_A,
        title: "Weekly Review",
        reviewDate: new Date(),
        status: "IN_REVIEW",
        notes: null,
        rating: null,
        thesis: null,
        whatWentWell: null,
        whatWentWrong: null,
        executionQuality: null,
        ruleAdherence: null,
        riskManagement: null,
        emotionalObservation: null,
        lessonsLearned: null,
        improvementActions: null,
        templateId: null,
        trades: [],
        tags: [],
        mistakes: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Valid: DRAFT -> IN_REVIEW
      const inReview = await updateReviewStatus(REVIEW_ID, "IN_REVIEW");
      expect(inReview.status).toBe("IN_REVIEW");

      // Valid: IN_REVIEW -> COMPLETED
      mockPrismaHolder.current.review.findFirst.mockResolvedValueOnce({
        id: REVIEW_ID,
        userId: USER_A,
        status: "IN_REVIEW",
      });
      mockPrismaHolder.current.review.update.mockResolvedValueOnce({
        id: REVIEW_ID,
        userId: USER_A,
        title: "Weekly Review",
        reviewDate: new Date(),
        status: "COMPLETED",
        notes: null,
        rating: null,
        thesis: null,
        whatWentWell: null,
        whatWentWrong: null,
        executionQuality: null,
        ruleAdherence: null,
        riskManagement: null,
        emotionalObservation: null,
        lessonsLearned: null,
        improvementActions: null,
        templateId: null,
        trades: [],
        tags: [],
        mistakes: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const completed = await updateReviewStatus(REVIEW_ID, "COMPLETED");
      expect(completed.status).toBe("COMPLETED");

      // Invalid status value rejected by validation
      await expect(
        updateReviewStatus(REVIEW_ID, "NONEXISTENT_STATUS" as never),
      ).rejects.toMatchObject({
        code: "VALIDATION",
        httpStatus: 400,
      });
    });

    it("calculates multi-trade metrics correctly for review", async () => {
      mockPrismaHolder.current.trade.findMany.mockResolvedValue([
        { id: "trade-1" },
        { id: "trade-2" },
      ]);

      const mockDbReview = {
        id: REVIEW_ID,
        userId: USER_A,
        title: "Bi-Weekly Strategy Performance",
        reviewDate: new Date("2026-05-15T00:00:00Z"),
        status: "COMPLETED",
        thesis: "Trend-continuation pullbacks",
        whatWentWell: "Strict stop loss placement",
        whatWentWrong: "Exited too early on runner",
        executionQuality: 9,
        ruleAdherence: 10,
        riskManagement: 9,
        emotionalObservation: "Calm, no FOMO",
        lessonsLearned: "Trailing stop with ATR gave higher expectancy",
        improvementActions: "Automate trailing target",
        notes: "Overall good execution",
        rating: 9,
        templateId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        trades: [
          {
            id: "rt-1",
            reviewId: REVIEW_ID,
            tradeId: "trade-1",
            notes: "Win 1",
            rating: 10,
            trade: {
              id: "trade-1",
              title: "NVDA",
              side: "LONG",
              status: "CLOSED",
              netPnl: new Prisma.Decimal(500),
              exitDate: new Date("2026-05-14T15:00:00Z"),
              actualRMultiple: new Prisma.Decimal(2.5),
              grossPnl: new Prisma.Decimal(520),
            },
          },
          {
            id: "rt-2",
            reviewId: REVIEW_ID,
            tradeId: "trade-2",
            notes: "Loss 1",
            rating: 8,
            trade: {
              id: "trade-2",
              title: "TSLA",
              side: "SHORT",
              status: "CLOSED",
              netPnl: new Prisma.Decimal(-200),
              exitDate: new Date("2026-05-15T14:00:00Z"),
              actualRMultiple: new Prisma.Decimal(-1.0),
              grossPnl: new Prisma.Decimal(-190),
            },
          },
        ],
        tags: [],
        mistakes: [],
        attachments: [],
      };

      mockPrismaHolder.current.review.findFirst.mockResolvedValue(mockDbReview);

      const review = await getReviewById(REVIEW_ID);
      expect(review.id).toBe(REVIEW_ID);
      expect(review.computedMetrics).toBeDefined();
      expect(review.computedMetrics?.tradeCount).toBe(2);
      expect(review.computedMetrics?.winCount).toBe(1);
      expect(review.computedMetrics?.lossCount).toBe(1);
      expect(review.computedMetrics?.winRate).toBe(50);
      expect(review.computedMetrics?.netPnl).toBe("300.00");
      expect(review.computedMetrics?.profitFactor).toBe(2.5); // 500 / 200
      expect(review.computedMetrics?.expectancy).toBe("150.00"); // 300 / 2
      expect(review.computedMetrics?.averageR).toBe("0.75"); // (2.5 - 1.0) / 2
    });

    it("sanitizes text content against stored XSS", async () => {
      mockPrismaHolder.current.review.create.mockImplementationOnce((args) => {
        return Promise.resolve({
          id: REVIEW_ID,
          userId: USER_A,
          title: args.data.title,
          reviewDate: args.data.reviewDate,
          status: args.data.status,
          thesis: args.data.thesis,
          whatWentWell: args.data.whatWentWell,
          whatWentWrong: args.data.whatWentWrong,
          executionQuality: args.data.executionQuality,
          ruleAdherence: args.data.ruleAdherence,
          riskManagement: args.data.riskManagement,
          emotionalObservation: args.data.emotionalObservation,
          lessonsLearned: args.data.lessonsLearned,
          improvementActions: args.data.improvementActions,
          notes: args.data.notes,
          rating: args.data.rating,
          templateId: null,
          trades: [],
          tags: [],
          mistakes: [],
          attachments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const review = await createReview({
        title: "Dangerous Title <script>alert(1)</script>",
        reviewDate: "2026-05-15",
        thesis: "Thesis with <img src=x onerror=alert('img-xss') /> payload",
        notes: "<a href='javascript:stealCookies()'>Click Here</a>",
      });

      expect(review.title).not.toContain("<script>");
      expect(review.thesis).not.toContain("onerror=");
      expect(review.notes).not.toContain("javascript:");
    });
  });
});
