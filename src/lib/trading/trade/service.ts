/**
 * Trade Domain — Service
 *
 * Server-only service layer for the Trade domain.
 *
 * Responsibilities:
 * - Authenticate the user via Better Auth session utilities.
 * - Enforce strict per-user data isolation on every query and mutation.
 * - Validate all input through `validation.ts`.
 * - Verify that referenced TradingAccount belongs to the user.
 * - Translate Prisma errors to the stable `TradeServiceError` model.
 * - Use Prisma transactions where multiple dependent writes are required.
 *
 * SECURITY: This module MUST NOT be imported from client components.
 * It imports from `server-only` to fail at build time if misused.
 */

import "server-only";

import { Prisma, TradeStatus } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { requireServerUserId } from "@/lib/auth/session";

import {
  validateCreateTradeInput,
  validateUpdateTradeInput,
  validateMergedTradeShape,
} from "./validation";
import {
  createAuthRequiredError,
  createDatabaseError,
  createNotFoundError,
  createValidationError,
} from "./errors";
import type {
  CreateTradeInput,
  DecimalString,
  TradeDto,
  TradeListFilters,
  TradeListPagination,
  TradeListResult,
  TradeListSort,
  TradeSideValue,
  TradeStatusValue,
  UpdateTradeInput,
} from "./types";

// ---------------------------------------------------------------------------
// Maximum page size for listTrades — protects against accidental
// full-table scans for 100k+ rows.
// ---------------------------------------------------------------------------
const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Prisma Decimal to a DecimalString without
 * floating point coercion. Prisma's Decimal.toString() already
 * preserves precision.
 */
function decimalToString(value: unknown): DecimalString | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value as DecimalString;
  // Prisma Decimal exposes .toString() which preserves precision
  if (typeof (value as { toString?: () => string }).toString === "function") {
    return (value as { toString: () => string }).toString() as DecimalString;
  }
  return null;
}

/**
 * Constructs a Prisma Decimal from a DecimalString.
 *
 * Uses the string constructor — no floating-point conversion, so exact
 * precision is preserved for financial values. For example:
 *   "100.1234567890" → Prisma.Decimal("100.1234567890")
 *
 * Returns null when the input is null or undefined.
 */
function decimalFromString(
  value: DecimalString | null | undefined,
): Prisma.Decimal | null {
  if (value === null || value === undefined) return null;
  // String input from validated DTOs is always safe to pass through.
  return new Prisma.Decimal(value);
}

/**
 * Builds a Prisma `where` clause that always scopes to the user.
 * Accepts a partial filter set, applies defaults, and merges in
 * user-scoping guarantees.
 */
function buildTradeWhere(
  userId: string,
  filters: TradeListFilters,
): Prisma.TradeWhereInput {
  const where: Prisma.TradeWhereInput = {
    userId, // hard scope — never trust a client-supplied userId
  };

  if (filters.ids && filters.ids.length > 0) {
    where.id = { in: [...filters.ids] };
  }

  if (filters.tradingAccountId) {
    where.tradingAccountId = filters.tradingAccountId;
  }

  if (filters.side) {
    where.side = filters.side;
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      if (filters.status.length > 0) {
        where.status = { in: filters.status as unknown as TradeStatus[] };
      }
    } else {
      where.status = filters.status as unknown as TradeStatus;
    }
  }

  if (filters.entryDateFrom || filters.entryDateTo) {
    where.entryDate = {
      ...(filters.entryDateFrom ? { gte: filters.entryDateFrom } : {}),
      ...(filters.entryDateTo ? { lt: filters.entryDateTo } : {}),
    };
  }

  if (filters.exitDateFrom || filters.exitDateTo) {
    where.exitDate = {
      ...(filters.exitDateFrom ? { gte: filters.exitDateFrom } : {}),
      ...(filters.exitDateTo ? { lt: filters.exitDateTo } : {}),
    };
  }

  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(sort: TradeListSort): Prisma.TradeOrderByWithRelationInput {
  return { [sort.field]: sort.direction };
}

function normalizePagination(
  pagination?: Partial<TradeListPagination>,
): TradeListPagination {
  const requestedPage = pagination?.page ?? 1;
  const requestedSize = pagination?.pageSize ?? DEFAULT_PAGE_SIZE;

  const page = Math.max(1, Math.floor(requestedPage));
  const pageSize = Math.max(
    1,
    Math.min(MAX_PAGE_SIZE, Math.floor(requestedSize)),
  );

  return { page, pageSize };
}

function defaultSort(): TradeListSort {
  return { field: "entryDate", direction: "desc" };
}

function toTradeDto(record: {
  id: string;
  userId: string;
  tradingAccountId: string;
  side: TradeSideValue;
  status: TradeStatusValue;
  entryPrice: unknown;
  entryDate: Date;
  exitPrice: unknown;
  exitDate: Date | null;
  stopLoss: unknown;
  takeProfit: unknown;
  riskAmount: unknown;
  plannedRiskReward: unknown;
  actualRMultiple: unknown;
  quantity: unknown;
  grossPnl: unknown;
  commission: unknown;
  fees: unknown;
  swap: unknown;
  netPnl: unknown;
  title: string | null;
  notes: string | null;
  strategyId: string | null;
  setupId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TradeDto {
  return {
    id: record.id,
    userId: record.userId,
    tradingAccountId: record.tradingAccountId,
    side: record.side,
    status: record.status,
    entryPrice: decimalToString(record.entryPrice) as DecimalString,
    entryDate: record.entryDate,
    exitPrice: decimalToString(record.exitPrice),
    exitDate: record.exitDate,
    stopLoss: decimalToString(record.stopLoss),
    takeProfit: decimalToString(record.takeProfit),
    riskAmount: decimalToString(record.riskAmount),
    plannedRiskReward: decimalToString(record.plannedRiskReward),
    actualRMultiple: decimalToString(record.actualRMultiple),
    quantity: decimalToString(record.quantity) as DecimalString,
    grossPnl: decimalToString(record.grossPnl),
    commission: decimalToString(record.commission),
    fees: decimalToString(record.fees),
    swap: decimalToString(record.swap),
    netPnl: decimalToString(record.netPnl),
    title: record.title,
    notes: record.notes,
    strategyId: record.strategyId,
    setupId: record.setupId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function resolveUserId(): Promise<string> {
  try {
    return await requireServerUserId();
  } catch {
    throw createAuthRequiredError();
  }
}

async function ensureAccountOwned(
  userId: string,
  tradingAccountId: string,
): Promise<void> {
  const account = await prisma.tradingAccount.findFirst({
    where: { id: tradingAccountId, userId },
    select: { id: true },
  });
  if (!account) {
    throw createNotFoundError("TradingAccount");
  }
}

// ---------------------------------------------------------------------------
// Public service API
// ---------------------------------------------------------------------------

export interface ListTradesOptions {
  readonly filters?: TradeListFilters;
  readonly sort?: TradeListSort;
  readonly pagination?: Partial<TradeListPagination>;
}

/**
 * Creates a new Trade.
 *
 * Steps:
 * 1. Resolve the authenticated user.
 * 2. Validate the input.
 * 3. Verify the referenced TradingAccount belongs to the user.
 * 4. Persist the trade.
 *
 * Throws:
 * - TradeServiceError(VALIDATION) on invalid input.
 * - TradeServiceError(AUTH_REQUIRED) when not authenticated.
 * - TradeServiceError(NOT_FOUND) when the trading account is not owned.
 * - TradeServiceError(DATABASE_ERROR) on unexpected database failure.
 */
export async function createTrade(
  input: CreateTradeInput,
): Promise<TradeDto> {
  const userId = await resolveUserId();

  const validation = validateCreateTradeInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  await ensureAccountOwned(userId, input.tradingAccountId);

  const status: TradeStatus = input.status ?? TradeStatus.OPEN;

  try {
    const record = await prisma.trade.create({
      data: {
        userId,
        tradingAccountId: input.tradingAccountId,
        side: input.side,
        status,
        entryPrice: decimalFromString(input.entryPrice)!,
        entryDate: input.entryDate,
        exitPrice: decimalFromString(input.exitPrice),
        exitDate: input.exitDate ?? null,
        stopLoss: decimalFromString(input.stopLoss),
        takeProfit: decimalFromString(input.takeProfit),
        riskAmount: decimalFromString(input.riskAmount),
        plannedRiskReward: decimalFromString(input.plannedRiskReward),
        quantity: decimalFromString(input.quantity)!,
        grossPnl: decimalFromString(input.grossPnl),
        commission: decimalFromString(input.commission),
        fees: decimalFromString(input.fees),
        swap: decimalFromString(input.swap),
        netPnl: decimalFromString(input.netPnl),
        title: input.title ?? null,
        notes: input.notes ?? null,
        strategyId: input.strategyId ?? null,
        setupId: input.setupId ?? null,
      },
    });

    return toTradeDto(record);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // P2003 = foreign key constraint failure (e.g. invalid tradingAccountId)
      if (err.code === "P2003") {
        throw createNotFoundError("TradingAccount");
      }
    }
    throw createDatabaseError(err);
  }
}

/**
 * Returns a single Trade by ID, scoped to the authenticated user.
 *
 * Throws:
 * - TradeServiceError(AUTH_REQUIRED) when not authenticated.
 * - TradeServiceError(NOT_FOUND) when the trade does not exist OR
 *   belongs to another user. We do NOT distinguish between the two
 *   to avoid leaking the existence of other users' trades.
 */
export async function getTradeById(id: string): Promise<TradeDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "id is required" }]);
  }

  try {
    const record = await prisma.trade.findFirst({
      where: { id, userId },
    });

    if (!record) {
      throw createNotFoundError("Trade");
    }

    return toTradeDto(record);
  } catch (err) {
    if (err instanceof Error && err.name === "TradeServiceError") throw err;
    throw createDatabaseError(err);
  }
}

export async function listTrades(
  options: ListTradesOptions = {},
): Promise<TradeListResult> {
  const userId = await resolveUserId();

  const filters = options.filters ?? {};
  const sort = options.sort ?? defaultSort();
  const pagination = normalizePagination(options.pagination);

  const where = buildTradeWhere(userId, filters);
  const orderBy = buildOrderBy(sort);
  const skip = (pagination.page - 1) * pagination.pageSize;
  const take = pagination.pageSize;

  try {
    const [items, total] = await prisma.$transaction([
      prisma.trade.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.trade.count({ where }),
    ]);

    return {
      items: items.map(toTradeDto),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  } catch (err) {
    throw createDatabaseError(err);
  }
}

/**
 * Updates a Trade.
 *
 * Steps:
 * 1. Resolve the authenticated user.
 * 2. Fetch the existing trade (user-scoped).
 * 3. Validate the patch input.
 * 4. Validate the merged shape (closed state consistency, date ordering).
 * 5. Persist changes.
 *
 * Throws:
 * - TradeServiceError(VALIDATION) on invalid input.
 * - TradeServiceError(NOT_FOUND) when the trade does not exist OR
 *   belongs to another user.
 * - TradeServiceError(DATABASE_ERROR) on unexpected failure.
 */
export async function updateTrade(
  id: string,
  input: UpdateTradeInput,
): Promise<TradeDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "id is required" }]);
  }

  const validation = validateUpdateTradeInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  let existing;
  try {
    existing = await prisma.trade.findFirst({ where: { id, userId } });
  } catch (err) {
    throw createDatabaseError(err);
  }

  if (!existing) {
    throw createNotFoundError("Trade");
  }

  // Apply patch in-memory to check cross-field invariants on the merged shape.
  const mergedStatus: TradeStatusValue =
    (input.status as TradeStatusValue | undefined) ?? (existing.status as TradeStatusValue);
  const mergedEntryDate: Date = input.entryDate ?? existing.entryDate;
  const mergedExitPrice =
    input.exitPrice !== undefined ? input.exitPrice : decimalToString(existing.exitPrice);
  const mergedExitDate =
    input.exitDate !== undefined ? input.exitDate : existing.exitDate;

  const merged = validateMergedTradeShape({
    status: mergedStatus,
    entryDate: mergedEntryDate,
    exitPrice: mergedExitPrice,
    exitDate: mergedExitDate,
  });
  if (!merged.isValid) {
    throw createValidationError(merged.errors);
  }

  // Build the Prisma update payload — only the fields that were provided.
  const data: Prisma.TradeUpdateInput = {};

  if (input.side !== undefined) data.side = input.side;
  if (input.entryPrice !== undefined) {
    data.entryPrice = decimalFromString(input.entryPrice)!;
  }
  if (input.entryDate !== undefined) data.entryDate = input.entryDate;
  if (input.exitPrice !== undefined) {
    data.exitPrice = decimalFromString(input.exitPrice);
  }
  if (input.exitDate !== undefined) {
    data.exitDate = input.exitDate ?? null;
  }
  if (input.stopLoss !== undefined) {
    data.stopLoss = decimalFromString(input.stopLoss);
  }
  if (input.takeProfit !== undefined) {
    data.takeProfit = decimalFromString(input.takeProfit);
  }
  if (input.riskAmount !== undefined) {
    data.riskAmount = decimalFromString(input.riskAmount);
  }
  if (input.plannedRiskReward !== undefined) {
    data.plannedRiskReward = decimalFromString(input.plannedRiskReward);
  }
  if (input.quantity !== undefined) {
    data.quantity = decimalFromString(input.quantity)!;
  }
  if (input.commission !== undefined) {
    data.commission = decimalFromString(input.commission);
  }
  if (input.fees !== undefined) {
    data.fees = decimalFromString(input.fees);
  }
  if (input.swap !== undefined) {
    data.swap = decimalFromString(input.swap);
  }
  if (input.grossPnl !== undefined) {
    data.grossPnl = decimalFromString(input.grossPnl);
  }
  if (input.netPnl !== undefined) {
    data.netPnl = decimalFromString(input.netPnl);
  }
  if (input.status !== undefined) data.status = input.status;
  if (input.title !== undefined) data.title = input.title ?? null;
  if (input.notes !== undefined) data.notes = input.notes ?? null;
  if (input.strategyId !== undefined) {
    data.strategy = input.strategyId
      ? { connect: { id: input.strategyId } }
      : { disconnect: true };
  }
  if (input.setupId !== undefined) {
    data.setup = input.setupId
      ? { connect: { id: input.setupId } }
      : { disconnect: true };
  }

  try {
    const record = await prisma.trade.update({
      where: { id },
      data,
    });
    return toTradeDto(record);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

/**
 * Deletes a Trade.
 *
 * Throws:
 * - TradeServiceError(AUTH_REQUIRED) when not authenticated.
 * - TradeServiceError(NOT_FOUND) when the trade does not exist OR
 *   belongs to another user.
 * - TradeServiceError(DATABASE_ERROR) on unexpected failure.
 */
export async function deleteTrade(id: string): Promise<void> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "id is required" }]);
  }

  // Verify ownership before delete. We use a transaction to:
  // - look up the trade (user-scoped)
  // - delete only if it exists
  // This guards against a TOCTOU race where another session deletes
  // the trade between the lookup and the delete.
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.trade.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!existing) return false;
      await tx.trade.delete({ where: { id } });
      return true;
    });

    if (!result) {
      throw createNotFoundError("Trade");
    }
  } catch (err) {
    if (err instanceof Error && err.name === "TradeServiceError") throw err;
    throw createDatabaseError(err);
  }
}

