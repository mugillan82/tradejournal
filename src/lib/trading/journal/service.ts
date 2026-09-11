/**
 * Journal Domain — Service
 *
 * Production-grade server-only service for Journal Entries, Trade Notes, and Trade Reviews.
 * Enforces server-side authentication, per-user data isolation, input validation,
 * transactional integrity, and sanitization of database errors.
 */

import "server-only";

import { prisma } from "@/lib/db/client";
import { requireServerUserId } from "@/lib/auth/session";
import type {
  JournalEntryDto,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  JournalEntryListFilters,
  JournalEntryListPagination,
  JournalEntryListResult,
  TradeNoteDto,
  CreateTradeNoteInput,
  UpdateTradeNoteInput,
  ReviewDto,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewListFilters,
  ReviewListPagination,
  ReviewListResult,
} from "./types";
import {
  JournalServiceError,
  createAuthRequiredError,
  createNotFoundError,
  createValidationError,
  createConflictError,
  createDatabaseError,
} from "./errors";
import {
  validateCreateJournalEntryInput,
  validateUpdateJournalEntryInput,
  validateCreateTradeNoteInput,
  validateUpdateTradeNoteInput,
  validateCreateReviewInput,
  validateUpdateReviewInput,
  normalizeDateToUtcMidnight,
} from "./validation";

async function resolveUserId(): Promise<string> {
  try {
    return await requireServerUserId();
  } catch {
    throw createAuthRequiredError();
  }
}

async function verifyTradeOwnership(tradeId: string, userId: string): Promise<void> {
  try {
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
      select: { id: true },
    });
    if (!trade) {
      throw createNotFoundError("Trade");
    }
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

async function verifyMultipleTradesOwnership(tradeIds: ReadonlyArray<string>, userId: string): Promise<void> {
  if (tradeIds.length === 0) return;
  try {
    const trades = await prisma.trade.findMany({
      where: { id: { in: [...tradeIds] }, userId },
      select: { id: true },
    });
    if (trades.length !== tradeIds.length) {
      throw createNotFoundError("One or more referenced trades");
    }
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 1. JOURNAL ENTRIES SERVICE
// ---------------------------------------------------------------------------

function toJournalEntryDto(record: {
  id: string;
  userId: string;
  entryDate: Date;
  mood: string | null;
  energy: number | null;
  focus: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): JournalEntryDto {
  return {
    id: record.id,
    userId: record.userId,
    entryDate: record.entryDate,
    mood: (record.mood as JournalEntryDto["mood"]) || null,
    energy: record.energy,
    focus: record.focus,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntryDto> {
  const userId = await resolveUserId();

  const validation = validateCreateJournalEntryInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const normalizedDate = normalizeDateToUtcMidnight(input.entryDate);

  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { userId, entryDate: normalizedDate },
      select: { id: true },
    });
    if (existing) {
      throw createConflictError("A journal entry already exists for this date");
    }

    const record = await prisma.journalEntry.create({
      data: {
        userId,
        entryDate: normalizedDate,
        mood: input.mood ?? null,
        energy: input.energy ?? null,
        focus: input.focus ?? null,
        notes: input.notes?.trim() || null,
      },
    });

    return toJournalEntryDto(record);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function getJournalEntryById(id: string): Promise<JournalEntryDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Journal entry ID is required" }]);
  }

  try {
    const record = await prisma.journalEntry.findFirst({
      where: { id, userId },
    });

    if (!record) {
      throw createNotFoundError("Journal entry");
    }

    return toJournalEntryDto(record);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function listJournalEntries(
  filters: JournalEntryListFilters = {},
  pagination: JournalEntryListPagination = { page: 1, pageSize: 50 },
): Promise<JournalEntryListResult> {
  const userId = await resolveUserId();

  const page = Math.max(1, pagination.page);
  const pageSize = Math.min(100, Math.max(1, pagination.pageSize));
  const skip = (page - 1) * pageSize;

  const where: {
    userId: string;
    entryDate?: { gte?: Date; lte?: Date };
    mood?: JournalEntryDto["mood"];
  } = { userId };

  if (filters.fromDate || filters.toDate) {
    where.entryDate = {};
    if (filters.fromDate) where.entryDate.gte = filters.fromDate;
    if (filters.toDate) where.entryDate.lte = filters.toDate;
  }

  if (filters.mood) {
    where.mood = filters.mood;
  }

  try {
    const [total, records] = await Promise.all([
      prisma.journalEntry.count({ where }),
      prisma.journalEntry.findMany({
        where,
        orderBy: { entryDate: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: records.map(toJournalEntryDto),
      total,
      page,
      pageSize,
    };
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function updateJournalEntry(
  id: string,
  input: UpdateJournalEntryInput,
): Promise<JournalEntryDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Journal entry ID is required" }]);
  }

  const validation = validateUpdateJournalEntryInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw createNotFoundError("Journal entry");
    }

    const data: {
      mood?: JournalEntryDto["mood"];
      energy?: number | null;
      focus?: number | null;
      notes?: string | null;
    } = {};

    if (input.mood !== undefined) data.mood = input.mood;
    if (input.energy !== undefined) data.energy = input.energy;
    if (input.focus !== undefined) data.focus = input.focus;
    if (input.notes !== undefined) data.notes = input.notes ? input.notes.trim() : null;

    const updated = await prisma.journalEntry.update({
      where: { id },
      data,
    });

    return toJournalEntryDto(updated);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Journal entry ID is required" }]);
  }

  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw createNotFoundError("Journal entry");
    }

    await prisma.journalEntry.delete({
      where: { id },
    });
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 2. TRADE NOTES SERVICE
// ---------------------------------------------------------------------------

function toTradeNoteDto(record: {
  id: string;
  tradeId: string;
  content: string;
  createdAt: Date;
}): TradeNoteDto {
  return {
    id: record.id,
    tradeId: record.tradeId,
    content: record.content,
    createdAt: record.createdAt,
  };
}

export async function listTradeNotes(tradeId: string): Promise<ReadonlyArray<TradeNoteDto>> {
  const userId = await resolveUserId();

  if (!tradeId || typeof tradeId !== "string") {
    throw createValidationError([{ path: "tradeId", message: "Trade ID is required" }]);
  }

  await verifyTradeOwnership(tradeId, userId);

  try {
    const records = await prisma.tradeNote.findMany({
      where: { tradeId },
      orderBy: { createdAt: "desc" },
    });

    return records.map(toTradeNoteDto);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function createTradeNote(input: CreateTradeNoteInput): Promise<TradeNoteDto> {
  const userId = await resolveUserId();

  const validation = validateCreateTradeNoteInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  await verifyTradeOwnership(input.tradeId, userId);

  try {
    const record = await prisma.tradeNote.create({
      data: {
        tradeId: input.tradeId,
        content: input.content.trim(),
      },
    });

    return toTradeNoteDto(record);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function updateTradeNote(
  tradeId: string,
  noteId: string,
  input: UpdateTradeNoteInput,
): Promise<TradeNoteDto> {
  const userId = await resolveUserId();

  if (!tradeId || typeof tradeId !== "string") {
    throw createValidationError([{ path: "tradeId", message: "Trade ID is required" }]);
  }
  if (!noteId || typeof noteId !== "string") {
    throw createValidationError([{ path: "noteId", message: "Note ID is required" }]);
  }

  const validation = validateUpdateTradeNoteInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  await verifyTradeOwnership(tradeId, userId);

  try {
    const existing = await prisma.tradeNote.findFirst({
      where: { id: noteId, tradeId },
      select: { id: true },
    });

    if (!existing) {
      throw createNotFoundError("Trade note");
    }

    const updated = await prisma.tradeNote.update({
      where: { id: noteId },
      data: { content: input.content.trim() },
    });

    return toTradeNoteDto(updated);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function deleteTradeNote(tradeId: string, noteId: string): Promise<void> {
  const userId = await resolveUserId();

  if (!tradeId || typeof tradeId !== "string") {
    throw createValidationError([{ path: "tradeId", message: "Trade ID is required" }]);
  }
  if (!noteId || typeof noteId !== "string") {
    throw createValidationError([{ path: "noteId", message: "Note ID is required" }]);
  }

  await verifyTradeOwnership(tradeId, userId);

  try {
    const existing = await prisma.tradeNote.findFirst({
      where: { id: noteId, tradeId },
      select: { id: true },
    });

    if (!existing) {
      throw createNotFoundError("Trade note");
    }

    await prisma.tradeNote.delete({
      where: { id: noteId },
    });
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 3. TRADE REVIEWS SERVICE
// ---------------------------------------------------------------------------

function toReviewDto(record: {
  id: string;
  userId: string;
  title: string | null;
  reviewDate: Date;
  notes: string | null;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
  trades?: ReadonlyArray<{
    id: string;
    reviewId: string;
    tradeId: string;
    notes: string | null;
    rating: number | null;
  }>;
}): ReviewDto {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    reviewDate: record.reviewDate,
    notes: record.notes,
    rating: record.rating,
    trades: (record.trades || []).map((t) => ({
      id: t.id,
      reviewId: t.reviewId,
      tradeId: t.tradeId,
      notes: t.notes,
      rating: t.rating,
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function createReview(input: CreateReviewInput): Promise<ReviewDto> {
  const userId = await resolveUserId();

  const validation = validateCreateReviewInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const reviewDate = typeof input.reviewDate === "string" ? new Date(input.reviewDate) : input.reviewDate;

  // If trades are provided, verify that all trades belong to the authenticated user
  const tradeIds = input.trades ? input.trades.map((t) => t.tradeId) : [];
  await verifyMultipleTradesOwnership(tradeIds, userId);

  try {
    const record = await prisma.review.create({
      data: {
        userId,
        title: input.title ? input.title.trim() : null,
        reviewDate,
        notes: input.notes ? input.notes.trim() : null,
        rating: input.rating ?? null,
        trades: input.trades && input.trades.length > 0
          ? {
              create: input.trades.map((t) => ({
                tradeId: t.tradeId,
                notes: t.notes ? t.notes.trim() : null,
                rating: t.rating ?? null,
              })),
            }
          : undefined,
      },
      include: { trades: true },
    });

    return toReviewDto(record);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function getReviewById(id: string): Promise<ReviewDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Review ID is required" }]);
  }

  try {
    const record = await prisma.review.findFirst({
      where: { id, userId },
      include: { trades: true },
    });

    if (!record) {
      throw createNotFoundError("Review");
    }

    return toReviewDto(record);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function listReviews(
  filters: ReviewListFilters = {},
  pagination: ReviewListPagination = { page: 1, pageSize: 50 },
): Promise<ReviewListResult> {
  const userId = await resolveUserId();

  const page = Math.max(1, pagination.page);
  const pageSize = Math.min(100, Math.max(1, pagination.pageSize));
  const skip = (page - 1) * pageSize;

  const where: {
    userId: string;
    reviewDate?: { gte?: Date; lte?: Date };
    OR?: Array<{ title?: { contains: string; mode: "insensitive" } } | { notes?: { contains: string; mode: "insensitive" } }>;
  } = { userId };

  if (filters.fromDate || filters.toDate) {
    where.reviewDate = {};
    if (filters.fromDate) where.reviewDate.gte = filters.fromDate;
    if (filters.toDate) where.reviewDate.lte = filters.toDate;
  }

  if (filters.search && filters.search.trim() !== "") {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [total, records] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        include: { trades: true },
        orderBy: { reviewDate: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: records.map(toReviewDto),
      total,
      page,
      pageSize,
    };
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function updateReview(
  id: string,
  input: UpdateReviewInput,
): Promise<ReviewDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Review ID is required" }]);
  }

  const validation = validateUpdateReviewInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const existing = await prisma.review.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    throw createNotFoundError("Review");
  }

  if (input.trades) {
    const tradeIds = input.trades.map((t) => t.tradeId);
    await verifyMultipleTradesOwnership(tradeIds, userId);
  }

  try {
    const data: {
      title?: string | null;
      reviewDate?: Date;
      notes?: string | null;
      rating?: number | null;
      trades?: {
        deleteMany: Record<string, unknown>;
        create: Array<{ tradeId: string; notes?: string | null; rating?: number | null }>;
      };
    } = {};

    if (input.title !== undefined) data.title = input.title ? input.title.trim() : null;
    if (input.reviewDate !== undefined) {
      data.reviewDate = typeof input.reviewDate === "string" ? new Date(input.reviewDate) : input.reviewDate;
    }
    if (input.notes !== undefined) data.notes = input.notes ? input.notes.trim() : null;
    if (input.rating !== undefined) data.rating = input.rating;

    if (input.trades !== undefined) {
      data.trades = {
        deleteMany: {},
        create: input.trades.map((t) => ({
          tradeId: t.tradeId,
          notes: t.notes ? t.notes.trim() : null,
          rating: t.rating ?? null,
        })),
      };
    }

    const updated = await prisma.review.update({
      where: { id },
      data,
      include: { trades: true },
    });

    return toReviewDto(updated);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function deleteReview(id: string): Promise<void> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Review ID is required" }]);
  }

  try {
    const existing = await prisma.review.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw createNotFoundError("Review");
    }

    await prisma.review.delete({
      where: { id },
    });
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

/**
 * Lists all reviews that contain a specific trade.
 */
export async function listReviewsForTrade(tradeId: string): Promise<ReadonlyArray<ReviewDto>> {
  const userId = await resolveUserId();

  if (!tradeId || typeof tradeId !== "string") {
    throw createValidationError([{ path: "tradeId", message: "Trade ID is required" }]);
  }

  await verifyTradeOwnership(tradeId, userId);

  try {
    const records = await prisma.review.findMany({
      where: {
        userId,
        trades: {
          some: { tradeId },
        },
      },
      include: { trades: true },
      orderBy: { reviewDate: "desc" },
    });

    return records.map(toReviewDto);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}
