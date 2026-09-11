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
    tradeNote: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
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
  listJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
  createTradeNote,
  listTradeNotes,
  updateTradeNote,
  deleteTradeNote,
  createReview,
  getReviewById,
  listReviews,
  updateReview,
  deleteReview,
  listReviewsForTrade,
} from "./service";

describe("Journal Domain Service", () => {
  const USER_A = "user-a";
  const TRADE_ID = "trade-123";
  const ENTRY_ID = "entry-123";
  const NOTE_ID = "note-123";
  const REVIEW_ID = "review-123";

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

  describe("Journal Entries", () => {
    it("creates a journal entry successfully", async () => {
      mockPrismaHolder.current.journalEntry.findFirst.mockResolvedValueOnce(null);
      mockPrismaHolder.current.journalEntry.create.mockResolvedValueOnce({
        id: ENTRY_ID,
        userId: USER_A,
        entryDate: new Date("2026-05-15T00:00:00Z"),
        mood: "GOOD",
        energy: 8,
        focus: 9,
        notes: "Great session",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await createJournalEntry({
        entryDate: "2026-05-15",
        mood: "GOOD",
        energy: 8,
        focus: 9,
        notes: "Great session",
      });

      expect(res.id).toBe(ENTRY_ID);
      expect(res.mood).toBe("GOOD");
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

    it("gets entry by ID for owned record", async () => {
      mockPrismaHolder.current.journalEntry.findFirst.mockResolvedValueOnce({
        id: ENTRY_ID,
        userId: USER_A,
        entryDate: new Date("2026-05-15T00:00:00Z"),
        mood: "GOOD",
        energy: null,
        focus: null,
        notes: null,
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
        mood: "VERY_GOOD",
        energy: 9,
        focus: 9,
        notes: "Updated",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await updateJournalEntry(ENTRY_ID, { mood: "VERY_GOOD" });
      expect(updated.mood).toBe("VERY_GOOD");

      mockPrismaHolder.current.journalEntry.delete.mockResolvedValueOnce({});
      await expect(deleteJournalEntry(ENTRY_ID)).resolves.not.toThrow();
    });
  });

  describe("Trade Notes", () => {
    it("rejects creating note if trade is not owned", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValueOnce(null);

      await expect(
        createTradeNote({ tradeId: TRADE_ID, content: "Test note" }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    });

    it("creates, lists, updates and deletes notes when trade is owned", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValue({ id: TRADE_ID });
      mockPrismaHolder.current.tradeNote.create.mockResolvedValueOnce({
        id: NOTE_ID,
        tradeId: TRADE_ID,
        content: "Scaled out 50%",
        createdAt: new Date(),
      });

      const res = await createTradeNote({ tradeId: TRADE_ID, content: "Scaled out 50%" });
      expect(res.id).toBe(NOTE_ID);
      expect(res.content).toBe("Scaled out 50%");

      mockPrismaHolder.current.tradeNote.findMany.mockResolvedValueOnce([
        { id: NOTE_ID, tradeId: TRADE_ID, content: "Scaled out 50%", createdAt: new Date() },
      ]);
      const list = await listTradeNotes(TRADE_ID);
      expect(list).toHaveLength(1);

      mockPrismaHolder.current.tradeNote.findFirst.mockResolvedValue({ id: NOTE_ID, tradeId: TRADE_ID });
      mockPrismaHolder.current.tradeNote.update.mockResolvedValueOnce({
        id: NOTE_ID,
        tradeId: TRADE_ID,
        content: "Updated note",
        createdAt: new Date(),
      });
      const updated = await updateTradeNote(TRADE_ID, NOTE_ID, { content: "Updated note" });
      expect(updated.content).toBe("Updated note");

      mockPrismaHolder.current.tradeNote.delete.mockResolvedValueOnce({});
      await expect(deleteTradeNote(TRADE_ID, NOTE_ID)).resolves.not.toThrow();
    });
  });

  describe("Trade Reviews", () => {
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

    it("creates, gets, lists, updates, and deletes reviews with valid owned trades", async () => {
      mockPrismaHolder.current.trade.findMany.mockResolvedValue([{ id: TRADE_ID }]);
      mockPrismaHolder.current.review.create.mockResolvedValueOnce({
        id: REVIEW_ID,
        userId: USER_A,
        title: "Weekly audit",
        reviewDate: new Date("2026-05-15T00:00:00Z"),
        notes: "Good discipline",
        rating: 8,
        createdAt: new Date(),
        updatedAt: new Date(),
        trades: [
          {
            id: "rt-1",
            reviewId: REVIEW_ID,
            tradeId: TRADE_ID,
            notes: "Great entry",
            rating: 9,
          },
        ],
      });

      const res = await createReview({
        title: "Weekly audit",
        reviewDate: "2026-05-15",
        notes: "Good discipline",
        rating: 8,
        trades: [{ tradeId: TRADE_ID, notes: "Great entry", rating: 9 }],
      });

      expect(res.id).toBe(REVIEW_ID);
      expect(res.trades).toHaveLength(1);

      mockPrismaHolder.current.review.findFirst.mockResolvedValue({
        id: REVIEW_ID,
        userId: USER_A,
        title: "Weekly audit",
        reviewDate: new Date(),
        notes: "Good discipline",
        rating: 8,
        createdAt: new Date(),
        updatedAt: new Date(),
        trades: [],
      });
      const fetched = await getReviewById(REVIEW_ID);
      expect(fetched.id).toBe(REVIEW_ID);

      mockPrismaHolder.current.review.count.mockResolvedValueOnce(1);
      mockPrismaHolder.current.review.findMany.mockResolvedValueOnce([
        {
          id: REVIEW_ID,
          userId: USER_A,
          title: "Weekly audit",
          reviewDate: new Date(),
          notes: "Good discipline",
          rating: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
          trades: [],
        },
      ]);
      const list = await listReviews();
      expect(list.items).toHaveLength(1);

      mockPrismaHolder.current.review.update.mockResolvedValueOnce({
        id: REVIEW_ID,
        userId: USER_A,
        title: "Updated Title",
        reviewDate: new Date(),
        notes: "Updated notes",
        rating: 9,
        createdAt: new Date(),
        updatedAt: new Date(),
        trades: [],
      });
      const updated = await updateReview(REVIEW_ID, { title: "Updated Title" });
      expect(updated.title).toBe("Updated Title");

      mockPrismaHolder.current.review.findMany.mockResolvedValueOnce([
        {
          id: REVIEW_ID,
          userId: USER_A,
          title: "Updated Title",
          reviewDate: new Date(),
          notes: "Updated notes",
          rating: 9,
          createdAt: new Date(),
          updatedAt: new Date(),
          trades: [],
        },
      ]);
      const tradeReviews = await listReviewsForTrade(TRADE_ID);
      expect(tradeReviews).toHaveLength(1);

      mockPrismaHolder.current.review.delete.mockResolvedValueOnce({});
      await expect(deleteReview(REVIEW_ID)).resolves.not.toThrow();
    });
  });
});

