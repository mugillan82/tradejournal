/**
 * Classification Domain — Service
 *
 * Production-grade server-only service for Tags, Strategies, Setups, Mistakes,
 * and their associations with Trades.
 *
 * Enforces:
 * - Server-side authentication via requireServerUserId()
 * - Strict user isolation (trade ownership + entity validation)
 * - Input validation & unknown field rejection
 * - Atomic transactional updates for associations
 * - Sanitized database error handling
 */

import "server-only";

import { prisma } from "@/lib/db/client";
import { requireServerUserId } from "@/lib/auth/session";
import type {
  TagDto,
  CreateTagInput,
  UpdateTagInput,
  StrategyDto,
  CreateStrategyInput,
  UpdateStrategyInput,
  SetupDto,
  CreateSetupInput,
  UpdateSetupInput,
  MistakeDto,
  CreateMistakeInput,
  UpdateMistakeInput,
  TradeClassificationSummaryDto,
  AssignTradeTagsInput,
  AssignTradeMistakesInput,
  AssignTradeStrategyInput,
  AssignTradeSetupInput,
} from "./types";
import {
  ClassificationServiceError,
  createAuthRequiredError,
  createNotFoundError,
  createValidationError,
  createConflictError,
  createDatabaseError,
} from "./errors";
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

// ---------------------------------------------------------------------------
// Helpers
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
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

function toTagDto(record: {
  id: string;
  name: string;
  color: string | null;
  createdAt: Date;
  _count?: { trades: number };
}): TagDto {
  return {
    id: record.id,
    name: record.name,
    color: record.color,
    createdAt: record.createdAt,
    ...(record._count ? { tradeCount: record._count.trades } : {}),
  };
}

function toStrategyDto(record: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { trades: number };
}): StrategyDto {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record._count ? { tradeCount: record._count.trades } : {}),
  };
}

function toSetupDto(record: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  _count?: { trades: number };
}): SetupDto {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    createdAt: record.createdAt,
    ...(record._count ? { tradeCount: record._count.trades } : {}),
  };
}

function toMistakeDto(record: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  _count?: { trades: number };
}): MistakeDto {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    createdAt: record.createdAt,
    ...(record._count ? { tradeCount: record._count.trades } : {}),
  };
}

// ---------------------------------------------------------------------------
// 1. TAG OPERATIONS
// ---------------------------------------------------------------------------

export async function createTag(input: CreateTagInput): Promise<TagDto> {
  await resolveUserId();

  const validation = validateCreateTagInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const name = input.name.trim();
  const color = input.color ? input.color.trim() : null;

  try {
    const existing = await prisma.tag.findUnique({
      where: { name },
    });
    if (existing) {
      throw createConflictError(`Tag with name '${name}' already exists`);
    }

    const tag = await prisma.tag.create({
      data: { name, color },
    });
    return toTagDto(tag);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function getTagById(id: string): Promise<TagDto> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Tag id is required" }]);
  }

  try {
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { trades: true } } },
    });
    if (!tag) {
      throw createNotFoundError("Tag");
    }
    return toTagDto(tag);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function listTags(): Promise<ReadonlyArray<TagDto>> {
  await resolveUserId();

  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { trades: true } } },
    });
    return tags.map(toTagDto);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function updateTag(id: string, input: UpdateTagInput): Promise<TagDto> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Tag id is required" }]);
  }

  const validation = validateUpdateTagInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  try {
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      throw createNotFoundError("Tag");
    }

    const data: { name?: string; color?: string | null } = {};
    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (trimmedName !== existing.name) {
        const duplicate = await prisma.tag.findUnique({ where: { name: trimmedName } });
        if (duplicate) {
          throw createConflictError(`Tag with name '${trimmedName}' already exists`);
        }
        data.name = trimmedName;
      }
    }
    if (input.color !== undefined) {
      data.color = input.color ? input.color.trim() : null;
    }

    const updated = await prisma.tag.update({
      where: { id },
      data,
      include: { _count: { select: { trades: true } } },
    });
    return toTagDto(updated);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function deleteTag(id: string): Promise<void> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Tag id is required" }]);
  }

  try {
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      throw createNotFoundError("Tag");
    }

    // Clean up TradeTag associations before deleting tag to prevent FK constraint error
    await prisma.$transaction([
      prisma.tradeTag.deleteMany({ where: { tagId: id } }),
      prisma.tag.delete({ where: { id } }),
    ]);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 2. STRATEGY OPERATIONS
// ---------------------------------------------------------------------------

export async function createStrategy(input: CreateStrategyInput): Promise<StrategyDto> {
  await resolveUserId();

  const validation = validateCreateStrategyInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const name = input.name.trim();
  const description = input.description ? input.description.trim() : null;

  try {
    const existing = await prisma.strategy.findUnique({
      where: { name },
    });
    if (existing) {
      throw createConflictError(`Strategy with name '${name}' already exists`);
    }

    const strategy = await prisma.strategy.create({
      data: { name, description },
    });
    return toStrategyDto(strategy);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function getStrategyById(id: string): Promise<StrategyDto> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Strategy id is required" }]);
  }

  try {
    const strategy = await prisma.strategy.findUnique({
      where: { id },
      include: { _count: { select: { trades: true } } },
    });
    if (!strategy) {
      throw createNotFoundError("Strategy");
    }
    return toStrategyDto(strategy);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function listStrategies(): Promise<ReadonlyArray<StrategyDto>> {
  await resolveUserId();

  try {
    const strategies = await prisma.strategy.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { trades: true } } },
    });
    return strategies.map(toStrategyDto);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function updateStrategy(
  id: string,
  input: UpdateStrategyInput,
): Promise<StrategyDto> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Strategy id is required" }]);
  }

  const validation = validateUpdateStrategyInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  try {
    const existing = await prisma.strategy.findUnique({ where: { id } });
    if (!existing) {
      throw createNotFoundError("Strategy");
    }

    const data: { name?: string; description?: string | null } = {};
    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (trimmedName !== existing.name) {
        const duplicate = await prisma.strategy.findUnique({ where: { name: trimmedName } });
        if (duplicate) {
          throw createConflictError(`Strategy with name '${trimmedName}' already exists`);
        }
        data.name = trimmedName;
      }
    }
    if (input.description !== undefined) {
      data.description = input.description ? input.description.trim() : null;
    }

    const updated = await prisma.strategy.update({
      where: { id },
      data,
      include: { _count: { select: { trades: true } } },
    });
    return toStrategyDto(updated);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function deleteStrategy(id: string): Promise<void> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Strategy id is required" }]);
  }

  try {
    const existing = await prisma.strategy.findUnique({ where: { id } });
    if (!existing) {
      throw createNotFoundError("Strategy");
    }

    // Set strategyId to null on associated trades before deleting
    await prisma.$transaction([
      prisma.trade.updateMany({
        where: { strategyId: id },
        data: { strategyId: null },
      }),
      prisma.strategy.delete({ where: { id } }),
    ]);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 3. SETUP OPERATIONS
// ---------------------------------------------------------------------------

export async function createSetup(input: CreateSetupInput): Promise<SetupDto> {
  await resolveUserId();

  const validation = validateCreateSetupInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const name = input.name.trim();
  const description = input.description ? input.description.trim() : null;

  try {
    const existing = await prisma.setup.findUnique({
      where: { name },
    });
    if (existing) {
      throw createConflictError(`Setup with name '${name}' already exists`);
    }

    const setup = await prisma.setup.create({
      data: { name, description },
    });
    return toSetupDto(setup);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function getSetupById(id: string): Promise<SetupDto> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Setup id is required" }]);
  }

  try {
    const setup = await prisma.setup.findUnique({
      where: { id },
      include: { _count: { select: { trades: true } } },
    });
    if (!setup) {
      throw createNotFoundError("Setup");
    }
    return toSetupDto(setup);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function listSetups(): Promise<ReadonlyArray<SetupDto>> {
  await resolveUserId();

  try {
    const setups = await prisma.setup.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { trades: true } } },
    });
    return setups.map(toSetupDto);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function updateSetup(id: string, input: UpdateSetupInput): Promise<SetupDto> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Setup id is required" }]);
  }

  const validation = validateUpdateSetupInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  try {
    const existing = await prisma.setup.findUnique({ where: { id } });
    if (!existing) {
      throw createNotFoundError("Setup");
    }

    const data: { name?: string; description?: string | null } = {};
    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (trimmedName !== existing.name) {
        const duplicate = await prisma.setup.findUnique({ where: { name: trimmedName } });
        if (duplicate) {
          throw createConflictError(`Setup with name '${trimmedName}' already exists`);
        }
        data.name = trimmedName;
      }
    }
    if (input.description !== undefined) {
      data.description = input.description ? input.description.trim() : null;
    }

    const updated = await prisma.setup.update({
      where: { id },
      data,
      include: { _count: { select: { trades: true } } },
    });
    return toSetupDto(updated);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function deleteSetup(id: string): Promise<void> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Setup id is required" }]);
  }

  try {
    const existing = await prisma.setup.findUnique({ where: { id } });
    if (!existing) {
      throw createNotFoundError("Setup");
    }

    // Set setupId to null on associated trades before deleting
    await prisma.$transaction([
      prisma.trade.updateMany({
        where: { setupId: id },
        data: { setupId: null },
      }),
      prisma.setup.delete({ where: { id } }),
    ]);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 4. MISTAKE OPERATIONS
// ---------------------------------------------------------------------------

export async function createMistake(input: CreateMistakeInput): Promise<MistakeDto> {
  await resolveUserId();

  const validation = validateCreateMistakeInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const name = input.name.trim();
  const description = input.description ? input.description.trim() : null;

  try {
    const existing = await prisma.mistake.findUnique({
      where: { name },
    });
    if (existing) {
      throw createConflictError(`Mistake with name '${name}' already exists`);
    }

    const mistake = await prisma.mistake.create({
      data: { name, description },
    });
    return toMistakeDto(mistake);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function getMistakeById(id: string): Promise<MistakeDto> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Mistake id is required" }]);
  }

  try {
    const mistake = await prisma.mistake.findUnique({
      where: { id },
      include: { _count: { select: { trades: true } } },
    });
    if (!mistake) {
      throw createNotFoundError("Mistake");
    }
    return toMistakeDto(mistake);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function listMistakes(): Promise<ReadonlyArray<MistakeDto>> {
  await resolveUserId();

  try {
    const mistakes = await prisma.mistake.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { trades: true } } },
    });
    return mistakes.map(toMistakeDto);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function updateMistake(
  id: string,
  input: UpdateMistakeInput,
): Promise<MistakeDto> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Mistake id is required" }]);
  }

  const validation = validateUpdateMistakeInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  try {
    const existing = await prisma.mistake.findUnique({ where: { id } });
    if (!existing) {
      throw createNotFoundError("Mistake");
    }

    const data: { name?: string; description?: string | null } = {};
    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (trimmedName !== existing.name) {
        const duplicate = await prisma.mistake.findUnique({ where: { name: trimmedName } });
        if (duplicate) {
          throw createConflictError(`Mistake with name '${trimmedName}' already exists`);
        }
        data.name = trimmedName;
      }
    }
    if (input.description !== undefined) {
      data.description = input.description ? input.description.trim() : null;
    }

    const updated = await prisma.mistake.update({
      where: { id },
      data,
      include: { _count: { select: { trades: true } } },
    });
    return toMistakeDto(updated);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function deleteMistake(id: string): Promise<void> {
  await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "Mistake id is required" }]);
  }

  try {
    const existing = await prisma.mistake.findUnique({ where: { id } });
    if (!existing) {
      throw createNotFoundError("Mistake");
    }

    // Delete TradeMistake associations first
    await prisma.$transaction([
      prisma.tradeMistake.deleteMany({ where: { mistakeId: id } }),
      prisma.mistake.delete({ where: { id } }),
    ]);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

// ---------------------------------------------------------------------------
// 5. TRADE CLASSIFICATIONS & ASSOCIATIONS
// ---------------------------------------------------------------------------

export async function getTradeClassifications(
  tradeId: string,
): Promise<TradeClassificationSummaryDto> {
  const userId = await resolveUserId();
  await verifyTradeOwnership(tradeId, userId);

  try {
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
      include: {
        strategy: true,
        setup: true,
        tags: {
          include: { tag: true },
        },
        mistakes: {
          include: { mistake: true },
        },
      },
    });

    if (!trade) {
      throw createNotFoundError("Trade");
    }

    return {
      tradeId: trade.id,
      strategy: trade.strategy ? toStrategyDto(trade.strategy) : null,
      setup: trade.setup ? toSetupDto(trade.setup) : null,
      tags: trade.tags.map((tt) => toTagDto(tt.tag)),
      mistakes: trade.mistakes.map((tm) => toMistakeDto(tm.mistake)),
    };
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function setTradeTags(
  tradeId: string,
  input: AssignTradeTagsInput,
): Promise<ReadonlyArray<TagDto>> {
  const userId = await resolveUserId();
  await verifyTradeOwnership(tradeId, userId);

  const validation = validateAssignTradeTagsInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const uniqueTagIds = Array.from(new Set(input.tagIds.map((t) => t.trim())));

  try {
    // Verify all tags exist
    if (uniqueTagIds.length > 0) {
      const tags = await prisma.tag.findMany({
        where: { id: { in: uniqueTagIds } },
        select: { id: true },
      });
      if (tags.length !== uniqueTagIds.length) {
        throw createValidationError([
          { path: "tagIds", message: "One or more specified tags do not exist" },
        ]);
      }
    }

    // Atomically replace TradeTags
    await prisma.$transaction([
      prisma.tradeTag.deleteMany({ where: { tradeId } }),
      ...(uniqueTagIds.length > 0
        ? [
            prisma.tradeTag.createMany({
              data: uniqueTagIds.map((tagId) => ({ tradeId, tagId })),
            }),
          ]
        : []),
    ]);

    const updated = await prisma.tradeTag.findMany({
      where: { tradeId },
      include: { tag: true },
    });
    return updated.map((tt) => toTagDto(tt.tag));
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function addTradeTag(tradeId: string, tagId: string): Promise<TagDto> {
  const userId = await resolveUserId();
  await verifyTradeOwnership(tradeId, userId);

  if (!tagId || typeof tagId !== "string") {
    throw createValidationError([{ path: "tagId", message: "tagId is required" }]);
  }

  try {
    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) {
      throw createNotFoundError("Tag");
    }

    // Upsert trade tag association
    await prisma.tradeTag.upsert({
      where: { tradeId_tagId: { tradeId, tagId } },
      create: { tradeId, tagId },
      update: {},
    });

    return toTagDto(tag);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function removeTradeTag(tradeId: string, tagId: string): Promise<void> {
  const userId = await resolveUserId();
  await verifyTradeOwnership(tradeId, userId);

  if (!tagId || typeof tagId !== "string") {
    throw createValidationError([{ path: "tagId", message: "tagId is required" }]);
  }

  try {
    await prisma.tradeTag.deleteMany({
      where: { tradeId, tagId },
    });
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function setTradeMistakes(
  tradeId: string,
  input: AssignTradeMistakesInput,
): Promise<ReadonlyArray<MistakeDto>> {
  const userId = await resolveUserId();
  await verifyTradeOwnership(tradeId, userId);

  const validation = validateAssignTradeMistakesInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const uniqueMistakeIds = Array.from(new Set(input.mistakeIds.map((m) => m.trim())));

  try {
    // Verify all mistakes exist
    if (uniqueMistakeIds.length > 0) {
      const mistakes = await prisma.mistake.findMany({
        where: { id: { in: uniqueMistakeIds } },
        select: { id: true },
      });
      if (mistakes.length !== uniqueMistakeIds.length) {
        throw createValidationError([
          { path: "mistakeIds", message: "One or more specified mistakes do not exist" },
        ]);
      }
    }

    // Atomically replace TradeMistakes
    await prisma.$transaction([
      prisma.tradeMistake.deleteMany({ where: { tradeId } }),
      ...(uniqueMistakeIds.length > 0
        ? [
            prisma.tradeMistake.createMany({
              data: uniqueMistakeIds.map((mistakeId) => ({ tradeId, mistakeId })),
            }),
          ]
        : []),
    ]);

    const updated = await prisma.tradeMistake.findMany({
      where: { tradeId },
      include: { mistake: true },
    });
    return updated.map((tm) => toMistakeDto(tm.mistake));
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function addTradeMistake(
  tradeId: string,
  mistakeId: string,
): Promise<MistakeDto> {
  const userId = await resolveUserId();
  await verifyTradeOwnership(tradeId, userId);

  if (!mistakeId || typeof mistakeId !== "string") {
    throw createValidationError([{ path: "mistakeId", message: "mistakeId is required" }]);
  }

  try {
    const mistake = await prisma.mistake.findUnique({ where: { id: mistakeId } });
    if (!mistake) {
      throw createNotFoundError("Mistake");
    }

    await prisma.tradeMistake.upsert({
      where: { tradeId_mistakeId: { tradeId, mistakeId } },
      create: { tradeId, mistakeId },
      update: {},
    });

    return toMistakeDto(mistake);
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function removeTradeMistake(
  tradeId: string,
  mistakeId: string,
): Promise<void> {
  const userId = await resolveUserId();
  await verifyTradeOwnership(tradeId, userId);

  if (!mistakeId || typeof mistakeId !== "string") {
    throw createValidationError([{ path: "mistakeId", message: "mistakeId is required" }]);
  }

  try {
    await prisma.tradeMistake.deleteMany({
      where: { tradeId, mistakeId },
    });
  } catch (err) {
    throw createDatabaseError(err);
  }
}

export async function assignTradeStrategy(
  tradeId: string,
  input: AssignTradeStrategyInput,
): Promise<StrategyDto | null> {
  const userId = await resolveUserId();
  await verifyTradeOwnership(tradeId, userId);

  const validation = validateAssignTradeStrategyInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  try {
    if (input.strategyId) {
      const strategy = await prisma.strategy.findUnique({
        where: { id: input.strategyId.trim() },
      });
      if (!strategy) {
        throw createNotFoundError("Strategy");
      }

      await prisma.trade.update({
        where: { id: tradeId },
        data: { strategyId: strategy.id },
      });

      return toStrategyDto(strategy);
    } else {
      await prisma.trade.update({
        where: { id: tradeId },
        data: { strategyId: null },
      });
      return null;
    }
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}

export async function assignTradeSetup(
  tradeId: string,
  input: AssignTradeSetupInput,
): Promise<SetupDto | null> {
  const userId = await resolveUserId();
  await verifyTradeOwnership(tradeId, userId);

  const validation = validateAssignTradeSetupInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  try {
    if (input.setupId) {
      const setup = await prisma.setup.findUnique({
        where: { id: input.setupId.trim() },
      });
      if (!setup) {
        throw createNotFoundError("Setup");
      }

      await prisma.trade.update({
        where: { id: tradeId },
        data: { setupId: setup.id },
      });

      return toSetupDto(setup);
    } else {
      await prisma.trade.update({
        where: { id: tradeId },
        data: { setupId: null },
      });
      return null;
    }
  } catch (err) {
    if (err instanceof ClassificationServiceError) throw err;
    throw createDatabaseError(err);
  }
}
