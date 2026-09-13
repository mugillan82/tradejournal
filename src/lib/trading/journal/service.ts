/**
 * Journal Domain — Service
 *
 * Production-grade server-only service for Daily Journal, Notebook,
 * Trade Notes, Structured Trade Reviews, and Review Templates.
 *
 * Enforces:
 * - Server-side authentication
 * - Per-user data isolation
 * - Input validation & XSS sanitization
 * - Safe relational ownership checks (Trades, Tags, Strategies, Setups, Mistakes, Templates)
 * - Strict status workflow transitions (DRAFT <-> IN_REVIEW <-> COMPLETED)
 * - Clean database error handling
 */

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireServerUserId } from "@/lib/auth/session";
import type {
  JournalMoodValue,
  JournalTagDto,
  JournalTradeSummaryDto,
  JournalEntryDto,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  JournalEntryListFilters,
  JournalEntryListPagination,
  JournalEntryListResult,
  NotebookNoteDto,
  CreateNotebookNoteInput,
  UpdateNotebookNoteInput,
  NotebookNoteListFilters,
  NotebookNoteListPagination,
  NotebookNoteListResult,
  TradeNoteDto,
  CreateTradeNoteInput,
  UpdateTradeNoteInput,
  ReviewTemplateDto,
  CreateReviewTemplateInput,
  UpdateReviewTemplateInput,
  ReviewDto,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewListFilters,
  ReviewListPagination,
  ReviewListResult,
  ReviewStatusValue,
  ReviewMetricsDto,
  TradeNotePhaseValue,
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
  validateCreateNotebookNoteInput,
  validateUpdateNotebookNoteInput,
  validateCreateTradeNoteInput,
  validateUpdateTradeNoteInput,
  validateCreateReviewTemplateInput,
  validateUpdateReviewTemplateInput,
  validateCreateReviewInput,
  validateUpdateReviewInput,
  validateReviewStatusTransition,
  normalizeDateToUtcMidnight,
  sanitizeTextContent,
} from "./validation";

// ---------------------------------------------------------------------------
// Internal Helper: Authentication & Ownership
// ---------------------------------------------------------------------------

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

async function verifyTagsOwnership(tagIds: ReadonlyArray<string>): Promise<void> {
  if (tagIds.length === 0) return;
  try {
    const tags = await prisma.tag.findMany({
      where: { id: { in: [...tagIds] } },
      select: { id: true },
    });
    if (tags.length !== tagIds.length) {
      throw createNotFoundError("One or more referenced tags");
    }
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

async function verifyStrategyOwnership(strategyId: string | undefined | null): Promise<void> {
  if (!strategyId) return;
  try {
    const strategy = await prisma.strategy.findFirst({
      where: { id: strategyId },
      select: { id: true },
    });
    if (!strategy) {
      throw createNotFoundError("Strategy");
    }
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

async function verifySetupOwnership(setupId: string | undefined | null): Promise<void> {
  if (!setupId) return;
  try {
    const setup = await prisma.setup.findFirst({
      where: { id: setupId },
      select: { id: true },
    });
    if (!setup) {
      throw createNotFoundError("Setup");
    }
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

async function verifyMistakesOwnership(mistakeIds: ReadonlyArray<string>): Promise<void> {
  if (mistakeIds.length === 0) return;
  try {
    const mistakes = await prisma.mistake.findMany({
      where: { id: { in: [...mistakeIds] } },
      select: { id: true },
    });
    if (mistakes.length !== mistakeIds.length) {
      throw createNotFoundError("One or more referenced mistakes");
    }
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

async function verifyTemplateOwnership(templateId: string | undefined | null, userId: string): Promise<void> {
  if (!templateId) return;
  try {
    const template = await prisma.reviewTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ userId }, { isDefault: true }],
      },
      select: { id: true },
    });
    if (!template) {
      throw createNotFoundError("Review Template");
    }
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 1. DAILY JOURNAL ENTRIES SERVICE
// ---------------------------------------------------------------------------

interface JournalEntryDbRecord {
  id: string;
  userId: string;
  entryDate: Date;
  title?: string | null;
  mood: string | null;
  energy: number | null;
  focus: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: Array<{
    tag: { id: string; name: string; color: string | null };
  }>;
  trades?: Array<{
    trade: {
      id: string;
      title: string | null;
      side: string;
      status: string;
      netPnl: Prisma.Decimal | null;
      exitDate: Date | null;
    };
  }>;
  attachments?: Array<{
    id: string;
    tradeId: string | null;
    journalEntryId: string | null;
    reviewId: string | null;
    notebookNoteId: string | null;
    fileName: string;
    fileUrl: string;
    fileSize: number | null;
    mimeType: string | null;
    uploadedAt: Date;
  }>;
}

function toJournalEntryDto(record: JournalEntryDbRecord): JournalEntryDto {
  const tags: JournalTagDto[] = (record.tags || []).map((t) => ({
    id: t.tag.id,
    name: t.tag.name,
    color: t.tag.color,
  }));

  const trades: JournalTradeSummaryDto[] = (record.trades || []).map((tr) => ({
    id: tr.trade.id,
    symbol: tr.trade.title || "TRADE",
    side: tr.trade.side,
    status: tr.trade.status,
    netPnl: tr.trade.netPnl !== null ? tr.trade.netPnl.toString() : null,
    exitDate: tr.trade.exitDate ? tr.trade.exitDate.toISOString() : null,
  }));

  return {
    id: record.id,
    userId: record.userId,
    entryDate: record.entryDate,
    title: record.title ?? null,
    mood: record.mood as JournalMoodValue | null,
    energy: record.energy,
    focus: record.focus,
    notes: record.notes,
    tags,
    trades,
    attachments: (record.attachments || []).map((a) => ({
      id: a.id,
      tradeId: a.tradeId,
      journalEntryId: a.journalEntryId,
      reviewId: a.reviewId,
      notebookNoteId: a.notebookNoteId,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      uploadedAt: a.uploadedAt,
    })),
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

  const entryDate = normalizeDateToUtcMidnight(input.entryDate);

  // Check unique per (userId, entryDate)
  const existing = await prisma.journalEntry.findFirst({
    where: { userId, entryDate },
    select: { id: true },
  });
  if (existing) {
    throw createConflictError("A journal entry already exists for this date");
  }

  if (input.tagIds && input.tagIds.length > 0) {
    await verifyTagsOwnership(input.tagIds);
  }
  if (input.tradeIds && input.tradeIds.length > 0) {
    await verifyMultipleTradesOwnership(input.tradeIds, userId);
  }

  const cleanTitle = input.title ? sanitizeTextContent(input.title.trim()) : null;
  const cleanNotes = input.notes ? sanitizeTextContent(input.notes.trim()) : null;

  try {
    const record = await prisma.journalEntry.create({
      data: {
        userId,
        entryDate,
        title: cleanTitle,
        mood: input.mood ?? null,
        energy: input.energy ?? null,
        focus: input.focus ?? null,
        notes: cleanNotes,
        tags: input.tagIds && input.tagIds.length > 0
          ? {
              create: input.tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
        trades: input.tradeIds && input.tradeIds.length > 0
          ? {
              create: input.tradeIds.map((tradeId) => ({ tradeId })),
            }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
        trades: { include: { trade: true } },
        attachments: true,
      },
    });

    return toJournalEntryDto(record as unknown as JournalEntryDbRecord);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw createConflictError("A journal entry already exists for this date");
    }
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
      include: {
        tags: { include: { tag: true } },
        trades: { include: { trade: true } },
        attachments: true,
      },
    });

    if (!record) {
      throw createNotFoundError("Journal entry");
    }

    return toJournalEntryDto(record as unknown as JournalEntryDbRecord);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function getJournalEntryByDate(dateInput: Date | string): Promise<JournalEntryDto | null> {
  const userId = await resolveUserId();

  let entryDate: Date;
  try {
    entryDate = normalizeDateToUtcMidnight(dateInput);
  } catch {
    throw createValidationError([{ path: "date", message: "Invalid date" }]);
  }

  try {
    const record = await prisma.journalEntry.findFirst({
      where: { userId, entryDate },
      include: {
        tags: { include: { tag: true } },
        trades: { include: { trade: true } },
        attachments: true,
      },
    });

    if (!record) return null;
    return toJournalEntryDto(record as unknown as JournalEntryDbRecord);
  } catch (err) {
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

  const where: Prisma.JournalEntryWhereInput = { userId };

  if (filters.fromDate || filters.toDate) {
    where.entryDate = {};
    if (filters.fromDate) where.entryDate.gte = normalizeDateToUtcMidnight(filters.fromDate);
    if (filters.toDate) where.entryDate.lte = normalizeDateToUtcMidnight(filters.toDate);
  }

  if (filters.mood) {
    where.mood = filters.mood;
  }

  if (filters.tagId) {
    where.tags = { some: { tagId: filters.tagId } };
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [total, records] = await Promise.all([
      prisma.journalEntry.count({ where }),
      prisma.journalEntry.findMany({
        where,
        include: {
          tags: { include: { tag: true } },
          trades: { include: { trade: true } },
          attachments: true,
        },
        orderBy: { entryDate: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: records.map((r) => toJournalEntryDto(r as unknown as JournalEntryDbRecord)),
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

  const existing = await prisma.journalEntry.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    throw createNotFoundError("Journal entry");
  }

  if (input.tagIds && input.tagIds.length > 0) {
    await verifyTagsOwnership(input.tagIds);
  }
  if (input.tradeIds && input.tradeIds.length > 0) {
    await verifyMultipleTradesOwnership(input.tradeIds, userId);
  }

  const updateData: Prisma.JournalEntryUpdateInput = {};

  if (input.title !== undefined) {
    updateData.title = input.title ? sanitizeTextContent(input.title.trim()) : null;
  }
  if (input.mood !== undefined) updateData.mood = input.mood;
  if (input.energy !== undefined) updateData.energy = input.energy;
  if (input.focus !== undefined) updateData.focus = input.focus;
  if (input.notes !== undefined) {
    updateData.notes = input.notes ? sanitizeTextContent(input.notes.trim()) : null;
  }

  if (input.tagIds !== undefined) {
    updateData.tags = {
      deleteMany: {},
      create: input.tagIds.map((tagId) => ({ tagId })),
    };
  }

  if (input.tradeIds !== undefined) {
    updateData.trades = {
      deleteMany: {},
      create: input.tradeIds.map((tradeId) => ({ tradeId })),
    };
  }

  try {
    const updated = await prisma.journalEntry.update({
      where: { id },
      data: updateData,
      include: {
        tags: { include: { tag: true } },
        trades: { include: { trade: true } },
        attachments: true,
      },
    });

    return toJournalEntryDto(updated as unknown as JournalEntryDbRecord);
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

  const existing = await prisma.journalEntry.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    throw createNotFoundError("Journal entry");
  }

  try {
    await prisma.journalEntry.delete({
      where: { id },
    });
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 2. NOTEBOOK SERVICE
// ---------------------------------------------------------------------------

interface NotebookNoteDbRecord {
  id: string;
  userId: string;
  title: string;
  content: string;
  strategyId: string | null;
  setupId: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  strategy?: { id: string; name: string } | null;
  setup?: { id: string; name: string } | null;
  tags?: Array<{
    tag: { id: string; name: string; color: string | null };
  }>;
  attachments?: Array<{
    id: string;
    tradeId: string | null;
    journalEntryId: string | null;
    reviewId: string | null;
    notebookNoteId: string | null;
    fileName: string;
    fileUrl: string;
    fileSize: number | null;
    mimeType: string | null;
    uploadedAt: Date;
  }>;
}

function toNotebookNoteDto(record: NotebookNoteDbRecord): NotebookNoteDto {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    content: record.content,
    strategyId: record.strategyId,
    strategyName: record.strategy ? record.strategy.name : null,
    setupId: record.setupId,
    setupName: record.setup ? record.setup.name : null,
    isArchived: record.isArchived,
    tags: (record.tags || []).map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color,
    })),
    attachments: (record.attachments || []).map((a) => ({
      id: a.id,
      tradeId: a.tradeId,
      journalEntryId: a.journalEntryId,
      reviewId: a.reviewId,
      notebookNoteId: a.notebookNoteId,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      uploadedAt: a.uploadedAt,
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function createNotebookNote(input: CreateNotebookNoteInput): Promise<NotebookNoteDto> {
  const userId = await resolveUserId();

  const validation = validateCreateNotebookNoteInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  await verifyStrategyOwnership(input.strategyId);
  await verifySetupOwnership(input.setupId);
  if (input.tagIds && input.tagIds.length > 0) {
    await verifyTagsOwnership(input.tagIds);
  }

  const cleanTitle = sanitizeTextContent(input.title.trim());
  const cleanContent = sanitizeTextContent(input.content.trim());

  try {
    const record = await prisma.notebookNote.create({
      data: {
        userId,
        title: cleanTitle,
        content: cleanContent,
        strategyId: input.strategyId ?? null,
        setupId: input.setupId ?? null,
        isArchived: input.isArchived ?? false,
        tags: input.tagIds && input.tagIds.length > 0
          ? {
              create: input.tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
      include: {
        strategy: { select: { id: true, name: true } },
        setup: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        attachments: true,
      },
    });

    return toNotebookNoteDto(record as unknown as NotebookNoteDbRecord);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function getNotebookNoteById(id: string): Promise<NotebookNoteDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Notebook note ID is required" }]);
  }

  try {
    const record = await prisma.notebookNote.findFirst({
      where: { id, userId },
      include: {
        strategy: { select: { id: true, name: true } },
        setup: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        attachments: true,
      },
    });

    if (!record) {
      throw createNotFoundError("Notebook note");
    }

    return toNotebookNoteDto(record as unknown as NotebookNoteDbRecord);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function listNotebookNotes(
  filters: NotebookNoteListFilters = {},
  pagination: NotebookNoteListPagination = { page: 1, pageSize: 50 },
): Promise<NotebookNoteListResult> {
  const userId = await resolveUserId();

  const page = Math.max(1, pagination.page);
  const pageSize = Math.min(100, Math.max(1, pagination.pageSize));
  const skip = (page - 1) * pageSize;

  const where: Prisma.NotebookNoteWhereInput = { userId };

  if (filters.isArchived !== undefined) {
    where.isArchived = filters.isArchived;
  }
  if (filters.strategyId) {
    where.strategyId = filters.strategyId;
  }
  if (filters.setupId) {
    where.setupId = filters.setupId;
  }
  if (filters.tagId) {
    where.tags = { some: { tagId: filters.tagId } };
  }
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [total, records] = await Promise.all([
      prisma.notebookNote.count({ where }),
      prisma.notebookNote.findMany({
        where,
        include: {
          strategy: { select: { id: true, name: true } },
          setup: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
          attachments: true,
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: records.map((r) => toNotebookNoteDto(r as unknown as NotebookNoteDbRecord)),
      total,
      page,
      pageSize,
    };
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function updateNotebookNote(
  id: string,
  input: UpdateNotebookNoteInput,
): Promise<NotebookNoteDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Notebook note ID is required" }]);
  }

  const validation = validateUpdateNotebookNoteInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const existing = await prisma.notebookNote.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    throw createNotFoundError("Notebook note");
  }

  if (input.strategyId !== undefined) {
    await verifyStrategyOwnership(input.strategyId);
  }
  if (input.setupId !== undefined) {
    await verifySetupOwnership(input.setupId);
  }
  if (input.tagIds !== undefined && input.tagIds.length > 0) {
    await verifyTagsOwnership(input.tagIds);
  }

  const updateData: Prisma.NotebookNoteUpdateInput = {};

  if (input.title !== undefined) {
    updateData.title = sanitizeTextContent(input.title.trim());
  }
  if (input.content !== undefined) {
    updateData.content = sanitizeTextContent(input.content.trim());
  }
  if (input.strategyId !== undefined) {
    updateData.strategy = input.strategyId ? { connect: { id: input.strategyId } } : { disconnect: true };
  }
  if (input.setupId !== undefined) {
    updateData.setup = input.setupId ? { connect: { id: input.setupId } } : { disconnect: true };
  }
  if (input.isArchived !== undefined) {
    updateData.isArchived = input.isArchived;
  }
  if (input.tagIds !== undefined) {
    updateData.tags = {
      deleteMany: {},
      create: input.tagIds.map((tagId) => ({ tagId })),
    };
  }

  try {
    const updated = await prisma.notebookNote.update({
      where: { id },
      data: updateData,
      include: {
        strategy: { select: { id: true, name: true } },
        setup: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        attachments: true,
      },
    });

    return toNotebookNoteDto(updated as unknown as NotebookNoteDbRecord);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function deleteNotebookNote(id: string): Promise<void> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Notebook note ID is required" }]);
  }

  const existing = await prisma.notebookNote.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    throw createNotFoundError("Notebook note");
  }

  try {
    await prisma.notebookNote.delete({
      where: { id },
    });
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 3. TRADE NOTES SERVICE
// ---------------------------------------------------------------------------

function toTradeNoteDto(record: {
  id: string;
  tradeId: string;
  content: string;
  phase?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}): TradeNoteDto {
  return {
    id: record.id,
    tradeId: record.tradeId,
    content: record.content,
    phase: (record.phase as TradeNotePhaseValue) ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt ?? record.createdAt,
  };
}

export async function createTradeNote(input: CreateTradeNoteInput): Promise<TradeNoteDto> {
  const userId = await resolveUserId();

  const validation = validateCreateTradeNoteInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  await verifyTradeOwnership(input.tradeId, userId);

  const cleanContent = sanitizeTextContent(input.content.trim());

  try {
    const record = await prisma.tradeNote.create({
      data: {
        tradeId: input.tradeId,
        content: cleanContent,
        phase: input.phase ?? null,
      },
    });

    return toTradeNoteDto(record);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function listTradeNotes(tradeId: string): Promise<ReadonlyArray<TradeNoteDto>> {
  const userId = await resolveUserId();

  if (!tradeId || typeof tradeId !== "string") {
    throw createValidationError([{ path: "tradeId", message: "tradeId is required" }]);
  }

  await verifyTradeOwnership(tradeId, userId);

  try {
    const records = await prisma.tradeNote.findMany({
      where: { tradeId },
      orderBy: { createdAt: "asc" },
    });

    return records.map(toTradeNoteDto);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function updateTradeNote(
  tradeIdOrNoteId: string,
  noteIdOrInput: string | UpdateTradeNoteInput,
  maybeInput?: UpdateTradeNoteInput,
): Promise<TradeNoteDto> {
  const userId = await resolveUserId();

  const isThreeArg = typeof noteIdOrInput === "string";
  const noteId = isThreeArg ? (noteIdOrInput as string) : tradeIdOrNoteId;
  const input = isThreeArg ? (maybeInput as UpdateTradeNoteInput) : (noteIdOrInput as UpdateTradeNoteInput);
  const tradeId = isThreeArg ? tradeIdOrNoteId : undefined;

  if (!noteId || typeof noteId !== "string") {
    throw createValidationError([{ path: "id", message: "Trade note ID is required" }]);
  }

  const validation = validateUpdateTradeNoteInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const existing = await prisma.tradeNote.findFirst({
    where: { id: noteId, ...(tradeId ? { tradeId } : {}) },
  });

  if (!existing) {
    throw createNotFoundError("Trade note");
  }

  await verifyTradeOwnership(existing.tradeId, userId);

  const updateData: { content?: string; phase?: string | null } = {};
  if (input.content !== undefined) {
    updateData.content = sanitizeTextContent(input.content.trim());
  }
  if (input.phase !== undefined) {
    updateData.phase = input.phase;
  }

  try {
    const updated = await prisma.tradeNote.update({
      where: { id: noteId },
      data: updateData,
    });

    return toTradeNoteDto(updated);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function deleteTradeNote(
  tradeIdOrNoteId: string,
  maybeNoteId?: string,
): Promise<void> {
  const userId = await resolveUserId();

  const noteId = maybeNoteId ? maybeNoteId : tradeIdOrNoteId;
  const tradeId = maybeNoteId ? tradeIdOrNoteId : undefined;

  if (!noteId || typeof noteId !== "string") {
    throw createValidationError([{ path: "id", message: "Trade note ID is required" }]);
  }

  const existing = await prisma.tradeNote.findFirst({
    where: { id: noteId, ...(tradeId ? { tradeId } : {}) },
  });

  if (!existing) {
    throw createNotFoundError("Trade note");
  }

  await verifyTradeOwnership(existing.tradeId, userId);

  try {
    await prisma.tradeNote.delete({
      where: { id: noteId },
    });
  } catch (err) {
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 4. REVIEW TEMPLATES SERVICE
// ---------------------------------------------------------------------------

const SYSTEM_DEFAULT_TEMPLATES: ReadonlyArray<{
  name: string;
  description: string;
  prompts: string[];
}> = [
  {
    name: "Pre-Trade Checklist",
    description: "Systematic pre-execution validation of thesis, setups, and risk limits.",
    prompts: [
      "Why am I taking this trade?",
      "What is the market structure and technical setup?",
      "Where is invalidation / stop loss?",
      "What is the calculated risk and position size?",
    ],
  },
  {
    name: "Post-Trade Reflection",
    description: "Detailed retrospective analysis immediately following trade closure.",
    prompts: [
      "Did I follow the trading plan and rules?",
      "What went well during execution and management?",
      "What mistakes, hesitations, or emotional impulses occurred?",
      "What concrete improvement will I make next time?",
    ],
  },
  {
    name: "Weekly Performance Review",
    description: "Comprehensive end-of-week synthesis across all executed trades.",
    prompts: [
      "What was the single best trade of the week and why?",
      "What was the worst trade or biggest deviation from rules?",
      "Which recurring mistakes were identified this week?",
      "Which strategy or setup yielded the highest quality executions?",
      "What is the top operational focus rule for next week?",
    ],
  },
];

function toReviewTemplateDto(record: {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  prompts: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ReviewTemplateDto {
  let promptsArray: string[] = [];
  try {
    const parsed = JSON.parse(record.prompts);
    if (Array.isArray(parsed)) {
      promptsArray = parsed.map((p) => String(p));
    }
  } catch {
    promptsArray = [];
  }
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    description: record.description,
    prompts: promptsArray,
    isDefault: record.isDefault,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function ensureDefaultTemplatesExist(): Promise<void> {
  try {
    const existingCount = await prisma.reviewTemplate.count({
      where: { isDefault: true },
    });
    if (existingCount >= SYSTEM_DEFAULT_TEMPLATES.length) return;

    for (const tpl of SYSTEM_DEFAULT_TEMPLATES) {
      const found = await prisma.reviewTemplate.findFirst({
        where: { name: tpl.name, isDefault: true },
      });
      if (!found) {
        await prisma.reviewTemplate.create({
          data: {
            name: tpl.name,
            description: tpl.description,
            type: "SYSTEM",
            prompts: JSON.stringify(tpl.prompts),
            isDefault: true,
          },
        });
      }
    }
  } catch (err) {
    // If table isn't ready or concurrent insert, ignore
    console.warn("[JournalService] Default template seeding skipped:", err);
  }
}

export async function listReviewTemplates(): Promise<ReadonlyArray<ReviewTemplateDto>> {
  const userId = await resolveUserId();

  await ensureDefaultTemplatesExist();

  try {
    const records = await prisma.reviewTemplate.findMany({
      where: {
        OR: [{ userId }, { isDefault: true }],
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return records.map(toReviewTemplateDto);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function getReviewTemplateById(id: string): Promise<ReviewTemplateDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Template ID is required" }]);
  }

  try {
    const record = await prisma.reviewTemplate.findFirst({
      where: {
        id,
        OR: [{ userId }, { isDefault: true }],
      },
    });

    if (!record) {
      throw createNotFoundError("Review template");
    }

    return toReviewTemplateDto(record);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function createReviewTemplate(input: CreateReviewTemplateInput): Promise<ReviewTemplateDto> {
  const userId = await resolveUserId();

  const validation = validateCreateReviewTemplateInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const cleanName = sanitizeTextContent(input.name.trim());
  const cleanDescription = input.description ? sanitizeTextContent(input.description.trim()) : null;
  const cleanPrompts = input.prompts.map((p) => sanitizeTextContent(p.trim()));

  try {
    const record = await prisma.reviewTemplate.create({
      data: {
        userId,
        name: cleanName,
        description: cleanDescription,
        type: "CUSTOM",
        prompts: JSON.stringify(cleanPrompts),
        isDefault: false,
      },
    });

    return toReviewTemplateDto(record);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function updateReviewTemplate(
  id: string,
  input: UpdateReviewTemplateInput,
): Promise<ReviewTemplateDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Template ID is required" }]);
  }

  const validation = validateUpdateReviewTemplateInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const existing = await prisma.reviewTemplate.findFirst({
    where: { id, userId, isDefault: false },
    select: { id: true },
  });

  if (!existing) {
    throw createNotFoundError("User-owned review template");
  }

  const updateData: Prisma.ReviewTemplateUpdateInput = {};
  if (input.name !== undefined) {
    updateData.name = sanitizeTextContent(input.name.trim());
  }
  if (input.description !== undefined) {
    updateData.description = input.description ? sanitizeTextContent(input.description.trim()) : null;
  }
  if (input.prompts !== undefined) {
    updateData.prompts = JSON.stringify(input.prompts.map((p) => sanitizeTextContent(p.trim())));
  }

  try {
    const updated = await prisma.reviewTemplate.update({
      where: { id },
      data: updateData,
    });

    return toReviewTemplateDto(updated);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function deleteReviewTemplate(id: string): Promise<void> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Template ID is required" }]);
  }

  const existing = await prisma.reviewTemplate.findFirst({
    where: { id, userId, isDefault: false },
    select: { id: true },
  });

  if (!existing) {
    throw createNotFoundError("User-owned review template");
  }

  try {
    await prisma.reviewTemplate.delete({
      where: { id },
    });
  } catch (err) {
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 5. STRUCTURED REVIEWS & WORKFLOW SERVICE
// ---------------------------------------------------------------------------

interface ReviewDbRecord {
  id: string;
  userId: string;
  title: string | null;
  reviewDate: Date;
  status: string;
  thesis: string | null;
  whatWentWell: string | null;
  whatWentWrong: string | null;
  executionQuality: number | null;
  ruleAdherence: number | null;
  riskManagement: number | null;
  emotionalObservation: string | null;
  lessonsLearned: string | null;
  improvementActions: string | null;
  notes: string | null;
  rating: number | null;
  templateId: string | null;
  template?: { name: string } | null;
  createdAt: Date;
  updatedAt: Date;
  trades?: Array<{
    id: string;
    reviewId: string;
    tradeId: string;
    notes: string | null;
    rating: number | null;
    trade?: {
      id: string;
      title: string | null;
      side: string;
      status: string;
      netPnl: Prisma.Decimal | null;
      exitDate: Date | null;
      actualRMultiple: Prisma.Decimal | null;
      grossPnl: Prisma.Decimal | null;
    };
  }>;
  tags?: Array<{
    tag: { id: string; name: string; color: string | null };
  }>;
  mistakes?: Array<{
    mistake: { id: string; name: string; description: string | null };
  }>;
  attachments?: Array<{
    id: string;
    tradeId: string | null;
    journalEntryId: string | null;
    reviewId: string | null;
    notebookNoteId: string | null;
    fileName: string;
    fileUrl: string;
    fileSize: number | null;
    mimeType: string | null;
    uploadedAt: Date;
  }>;
}

function calculateReviewMetrics(trades: ReadonlyArray<{
  trade?: {
    status: string;
    netPnl: Prisma.Decimal | null;
    actualRMultiple: Prisma.Decimal | null;
    grossPnl: Prisma.Decimal | null;
  };
}>): ReviewMetricsDto {
  let totalTrades = 0;
  let winCount = 0;
  let lossCount = 0;
  let totalNetPnl = new Prisma.Decimal(0);
  let totalGrossProfit = new Prisma.Decimal(0);
  let totalGrossLoss = new Prisma.Decimal(0);
  let totalR = new Prisma.Decimal(0);
  let rCount = 0;

  for (const item of trades) {
    if (!item.trade) continue;
    totalTrades++;
    const net = item.trade.netPnl;
    if (net !== null) {
      totalNetPnl = totalNetPnl.plus(net);
      if (net.greaterThan(0)) {
        winCount++;
        totalGrossProfit = totalGrossProfit.plus(net);
      } else if (net.lessThan(0)) {
        lossCount++;
        totalGrossLoss = totalGrossLoss.plus(net.abs());
      }
    }
    const r = item.trade.actualRMultiple;
    if (r !== null) {
      totalR = totalR.plus(r);
      rCount++;
    }
  }

  const winRate = totalTrades > 0 ? Math.round((winCount / totalTrades) * 10000) / 100 : 0;
  const profitFactor = totalGrossLoss.greaterThan(0)
    ? Math.round(totalGrossProfit.dividedBy(totalGrossLoss).toNumber() * 100) / 100
    : totalGrossProfit.greaterThan(0)
      ? 100
      : null;
  const expectancy = totalTrades > 0
    ? totalNetPnl.dividedBy(totalTrades).toFixed(2)
    : null;
  const averageR = rCount > 0
    ? totalR.dividedBy(rCount).toFixed(2)
    : null;

  return {
    tradeCount: totalTrades,
    winCount,
    lossCount,
    winRate,
    netPnl: totalNetPnl.toFixed(2),
    profitFactor,
    expectancy,
    averageR,
  };
}

function toReviewDto(record: ReviewDbRecord): ReviewDto {
  const trades = (record.trades || []).map((t) => ({
    id: t.id,
    reviewId: t.reviewId,
    tradeId: t.tradeId,
    notes: t.notes,
    rating: t.rating,
    trade: t.trade
      ? {
          id: t.trade.id,
          symbol: t.trade.title || "TRADE",
          side: t.trade.side,
          status: t.trade.status,
          netPnl: t.trade.netPnl !== null ? t.trade.netPnl.toString() : null,
          exitDate: t.trade.exitDate ? t.trade.exitDate.toISOString() : null,
        }
      : undefined,
  }));

  const metrics = calculateReviewMetrics(record.trades || []);

  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    reviewDate: record.reviewDate,
    status: (record.status as ReviewStatusValue) || "DRAFT",
    thesis: record.thesis,
    whatWentWell: record.whatWentWell,
    whatWentWrong: record.whatWentWrong,
    executionQuality: record.executionQuality,
    ruleAdherence: record.ruleAdherence,
    riskManagement: record.riskManagement,
    emotionalObservations: record.emotionalObservation,
    lessonsLearned: record.lessonsLearned,
    improvementActions: record.improvementActions,
    notes: record.notes,
    rating: record.rating,
    templateId: record.templateId,
    templateName: record.template ? record.template.name : null,
    trades,
    tags: (record.tags || []).map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color,
    })),
    mistakes: (record.mistakes || []).map((m) => ({
      id: m.mistake.id,
      name: m.mistake.name,
      description: m.mistake.description,
    })),
    attachments: (record.attachments || []).map((a) => ({
      id: a.id,
      tradeId: a.tradeId,
      journalEntryId: a.journalEntryId,
      reviewId: a.reviewId,
      notebookNoteId: a.notebookNoteId,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      uploadedAt: a.uploadedAt,
    })),
    computedMetrics: metrics,
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

  // Verify relations ownership
  if (input.trades && input.trades.length > 0) {
    const tradeIds = input.trades.map((t) => t.tradeId);
    await verifyMultipleTradesOwnership(tradeIds, userId);
  }
  if (input.tagIds && input.tagIds.length > 0) {
    await verifyTagsOwnership(input.tagIds);
  }
  if (input.mistakeIds && input.mistakeIds.length > 0) {
    await verifyMistakesOwnership(input.mistakeIds);
  }
  await verifyTemplateOwnership(input.templateId, userId);

  const cleanTitle = input.title ? sanitizeTextContent(input.title.trim()) : null;
  const cleanThesis = input.thesis ? sanitizeTextContent(input.thesis.trim()) : null;
  const cleanWhatWentWell = input.whatWentWell ? sanitizeTextContent(input.whatWentWell.trim()) : null;
  const cleanWhatWentWrong = input.whatWentWrong ? sanitizeTextContent(input.whatWentWrong.trim()) : null;
  const cleanEmotional = input.emotionalObservations ? sanitizeTextContent(input.emotionalObservations.trim()) : null;
  const cleanLessons = input.lessonsLearned ? sanitizeTextContent(input.lessonsLearned.trim()) : null;
  const cleanActions = input.improvementActions ? sanitizeTextContent(input.improvementActions.trim()) : null;
  const cleanNotes = input.notes ? sanitizeTextContent(input.notes.trim()) : null;

  try {
    const record = await prisma.review.create({
      data: {
        userId,
        title: cleanTitle,
        reviewDate,
        status: input.status ?? "DRAFT",
        thesis: cleanThesis,
        whatWentWell: cleanWhatWentWell,
        whatWentWrong: cleanWhatWentWrong,
        executionQuality: input.executionQuality ?? null,
        ruleAdherence: input.ruleAdherence ?? null,
        riskManagement: input.riskManagement ?? null,
        emotionalObservation: cleanEmotional,
        lessonsLearned: cleanLessons,
        improvementActions: cleanActions,
        notes: cleanNotes,
        rating: input.rating ?? null,
        templateId: input.templateId ?? null,
        trades: input.trades && input.trades.length > 0
          ? {
              create: input.trades.map((t) => ({
                tradeId: t.tradeId,
                notes: t.notes ? sanitizeTextContent(t.notes.trim()) : null,
                rating: t.rating ?? null,
              })),
            }
          : undefined,
        tags: input.tagIds && input.tagIds.length > 0
          ? {
              create: input.tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
        mistakes: input.mistakeIds && input.mistakeIds.length > 0
          ? {
              create: input.mistakeIds.map((mistakeId) => ({ mistakeId })),
            }
          : undefined,
      },
      include: {
        template: { select: { name: true } },
        trades: {
          include: {
            trade: {
              select: {
                id: true,
                title: true,
                side: true,
                status: true,
                netPnl: true,
                exitDate: true,
                actualRMultiple: true,
                grossPnl: true,
              },
            },
          },
        },
        tags: { include: { tag: true } },
        mistakes: { include: { mistake: true } },
        attachments: true,
      },
    });

    return toReviewDto(record as unknown as ReviewDbRecord);
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
      include: {
        template: { select: { name: true } },
        trades: {
          include: {
            trade: {
              select: {
                id: true,
                title: true,
                side: true,
                status: true,
                netPnl: true,
                exitDate: true,
                actualRMultiple: true,
                grossPnl: true,
              },
            },
          },
        },
        tags: { include: { tag: true } },
        mistakes: { include: { mistake: true } },
        attachments: true,
      },
    });

    if (!record) {
      throw createNotFoundError("Review");
    }

    return toReviewDto(record as unknown as ReviewDbRecord);
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

  const where: Prisma.ReviewWhereInput = { userId };

  if (filters.fromDate || filters.toDate) {
    where.reviewDate = {};
    if (filters.fromDate) where.reviewDate.gte = filters.fromDate;
    if (filters.toDate) where.reviewDate.lte = filters.toDate;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.rating) {
    where.rating = filters.rating;
  }

  if (filters.tagId) {
    where.tags = { some: { tagId: filters.tagId } };
  }

  if (filters.mistakeId) {
    where.mistakes = { some: { mistakeId: filters.mistakeId } };
  }

  if (filters.tradeId) {
    where.trades = { some: { tradeId: filters.tradeId } };
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { thesis: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { lessonsLearned: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [total, records] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        include: {
          template: { select: { name: true } },
          trades: {
            include: {
              trade: {
                select: {
                  id: true,
                  title: true,
                  side: true,
                  status: true,
                  netPnl: true,
                  exitDate: true,
                  actualRMultiple: true,
                  grossPnl: true,
                },
              },
            },
          },
          tags: { include: { tag: true } },
          mistakes: { include: { mistake: true } },
          attachments: true,
        },
        orderBy: { reviewDate: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: records.map((r) => toReviewDto(r as unknown as ReviewDbRecord)),
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
    select: { id: true, status: true },
  });

  if (!existing) {
    throw createNotFoundError("Review");
  }

  // Validate status transition if changing status
  if (input.status && input.status !== existing.status) {
    const statusValidation = validateReviewStatusTransition(
      existing.status as ReviewStatusValue,
      input.status,
    );
    if (!statusValidation.isValid) {
      throw createValidationError(statusValidation.errors);
    }
  }

  if (input.trades) {
    const tradeIds = input.trades.map((t) => t.tradeId);
    await verifyMultipleTradesOwnership(tradeIds, userId);
  }
  if (input.tagIds && input.tagIds.length > 0) {
    await verifyTagsOwnership(input.tagIds);
  }
  if (input.mistakeIds && input.mistakeIds.length > 0) {
    await verifyMistakesOwnership(input.mistakeIds);
  }
  if (input.templateId !== undefined) {
    await verifyTemplateOwnership(input.templateId, userId);
  }

  const updateData: Prisma.ReviewUpdateInput = {};

  if (input.title !== undefined) updateData.title = input.title ? sanitizeTextContent(input.title.trim()) : null;
  if (input.reviewDate !== undefined) {
    updateData.reviewDate = typeof input.reviewDate === "string" ? new Date(input.reviewDate) : input.reviewDate;
  }
  if (input.status !== undefined) updateData.status = input.status;
  if (input.thesis !== undefined) updateData.thesis = input.thesis ? sanitizeTextContent(input.thesis.trim()) : null;
  if (input.whatWentWell !== undefined) updateData.whatWentWell = input.whatWentWell ? sanitizeTextContent(input.whatWentWell.trim()) : null;
  if (input.whatWentWrong !== undefined) updateData.whatWentWrong = input.whatWentWrong ? sanitizeTextContent(input.whatWentWrong.trim()) : null;
  if (input.executionQuality !== undefined) updateData.executionQuality = input.executionQuality;
  if (input.ruleAdherence !== undefined) updateData.ruleAdherence = input.ruleAdherence;
  if (input.riskManagement !== undefined) updateData.riskManagement = input.riskManagement;
  if (input.emotionalObservations !== undefined) updateData.emotionalObservation = input.emotionalObservations ? sanitizeTextContent(input.emotionalObservations.trim()) : null;
  if (input.lessonsLearned !== undefined) updateData.lessonsLearned = input.lessonsLearned ? sanitizeTextContent(input.lessonsLearned.trim()) : null;
  if (input.improvementActions !== undefined) updateData.improvementActions = input.improvementActions ? sanitizeTextContent(input.improvementActions.trim()) : null;
  if (input.notes !== undefined) updateData.notes = input.notes ? sanitizeTextContent(input.notes.trim()) : null;
  if (input.rating !== undefined) updateData.rating = input.rating;
  if (input.templateId !== undefined) {
    updateData.template = input.templateId ? { connect: { id: input.templateId } } : { disconnect: true };
  }

  if (input.trades !== undefined) {
    updateData.trades = {
      deleteMany: {},
      create: input.trades.map((t) => ({
        tradeId: t.tradeId,
        notes: t.notes ? sanitizeTextContent(t.notes.trim()) : null,
        rating: t.rating ?? null,
      })),
    };
  }

  if (input.tagIds !== undefined) {
    updateData.tags = {
      deleteMany: {},
      create: input.tagIds.map((tagId) => ({ tagId })),
    };
  }

  if (input.mistakeIds !== undefined) {
    updateData.mistakes = {
      deleteMany: {},
      create: input.mistakeIds.map((mistakeId) => ({ mistakeId })),
    };
  }

  try {
    const updated = await prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        template: { select: { name: true } },
        trades: {
          include: {
            trade: {
              select: {
                id: true,
                title: true,
                side: true,
                status: true,
                netPnl: true,
                exitDate: true,
                actualRMultiple: true,
                grossPnl: true,
              },
            },
          },
        },
        tags: { include: { tag: true } },
        mistakes: { include: { mistake: true } },
        attachments: true,
      },
    });

    return toReviewDto(updated as unknown as ReviewDbRecord);
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function updateReviewStatus(
  id: string,
  newStatus: ReviewStatusValue,
): Promise<ReviewDto> {
  return updateReview(id, { status: newStatus });
}

export async function deleteReview(id: string): Promise<void> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Review ID is required" }]);
  }

  const existing = await prisma.review.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    throw createNotFoundError("Review");
  }

  try {
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
      include: {
        template: { select: { name: true } },
        trades: {
          include: {
            trade: {
              select: {
                id: true,
                title: true,
                side: true,
                status: true,
                netPnl: true,
                exitDate: true,
                actualRMultiple: true,
                grossPnl: true,
              },
            },
          },
        },
        tags: { include: { tag: true } },
        mistakes: { include: { mistake: true } },
        attachments: true,
      },
      orderBy: { reviewDate: "desc" },
    });

    return records.map((r) => toReviewDto(r as unknown as ReviewDbRecord));
  } catch (err) {
    if (err instanceof JournalServiceError) throw err;
    throw createDatabaseError(err);
  }
}
