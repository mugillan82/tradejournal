/**
 * Trading Account Domain — Service
 *
 * Server-only service layer for the Trading Account domain.
 *
 * Responsibilities:
 * - Authenticate user via `requireServerUserId()`.
 * - Enforce strict per-user data isolation on every query and mutation.
 * - Validate all input DTOs via `validation.ts`.
 * - Translate Prisma errors to stable `TradeServiceError` models.
 * - Preserve exact Decimal precision for financial fields.
 *
 * SECURITY: Server-side only module. Must not be imported in client components.
 */

import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { requireServerUserId } from "@/lib/auth/session";

import {
  validateCreateTradingAccountInput,
  validateUpdateTradingAccountInput,
} from "./validation";
import {
  createAuthRequiredError,
  createDatabaseError,
  createNotFoundError,
  createValidationError,
} from "../trade/errors";
import type {
  CreateTradingAccountInput,
  DecimalString,
  TradingAccountDto,
  TradingAccountListFilters,
  TradingAccountListPagination,
  TradingAccountListResult,
  TradingAccountListSort,
  UpdateTradingAccountInput,
} from "./types";

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decimalToString(value: unknown): DecimalString | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value as DecimalString;
  if (typeof (value as { toString?: () => string }).toString === "function") {
    return (value as { toString: () => string }).toString() as DecimalString;
  }
  return null;
}

function decimalFromString(
  value: DecimalString | null | undefined,
): Prisma.Decimal | null {
  if (value === null || value === undefined) return null;
  return new Prisma.Decimal(value);
}

function buildAccountWhere(
  userId: string,
  filters: TradingAccountListFilters,
): Prisma.TradingAccountWhereInput {
  const where: Prisma.TradingAccountWhereInput = {
    userId, // hard scope — never trust client-supplied userId
  };

  if (filters.ids && filters.ids.length > 0) {
    where.id = { in: [...filters.ids] };
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.currency) {
    where.currency = filters.currency;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim();
    where.name = { contains: term, mode: "insensitive" };
  }

  return where;
}

function buildOrderBy(
  sort: TradingAccountListSort,
): Prisma.TradingAccountOrderByWithRelationInput {
  return { [sort.field]: sort.direction };
}

function normalizePagination(
  pagination?: Partial<TradingAccountListPagination>,
): TradingAccountListPagination {
  const requestedPage = pagination?.page ?? 1;
  const requestedSize = pagination?.pageSize ?? DEFAULT_PAGE_SIZE;

  const page = Math.max(1, Math.floor(requestedPage));
  const pageSize = Math.max(
    1,
    Math.min(MAX_PAGE_SIZE, Math.floor(requestedSize)),
  );

  return { page, pageSize };
}

function defaultSort(): TradingAccountListSort {
  return { field: "createdAt", direction: "desc" };
}

function toTradingAccountDto(record: {
  id: string;
  userId: string;
  name: string;
  type: string;
  currency: string;
  initialBalance: unknown;
  currentBalance: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TradingAccountDto {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    type: record.type,
    currency: record.currency,
    initialBalance: decimalToString(record.initialBalance),
    currentBalance: decimalToString(record.currentBalance),
    isActive: record.isActive,
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

// ---------------------------------------------------------------------------
// Public Service API
// ---------------------------------------------------------------------------

export interface ListTradingAccountsOptions {
  readonly filters?: TradingAccountListFilters;
  readonly sort?: TradingAccountListSort;
  readonly pagination?: Partial<TradingAccountListPagination>;
}

/**
 * Creates a new TradingAccount for the authenticated user.
 */
export async function createTradingAccount(
  input: CreateTradingAccountInput,
): Promise<TradingAccountDto> {
  const userId = await resolveUserId();

  const validation = validateCreateTradingAccountInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  try {
    const record = await prisma.tradingAccount.create({
      data: {
        userId,
        name: input.name.trim(),
        type: input.type ?? "PAPER_TRADING",
        currency: input.currency ?? "USD",
        initialBalance: decimalFromString(input.initialBalance),
        currentBalance: decimalFromString(input.currentBalance ?? input.initialBalance),
        isActive: input.isActive ?? true,
      },
    });

    return toTradingAccountDto(record);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

/**
 * Retrieves a single TradingAccount by ID, scoped to the authenticated user.
 */
export async function getTradingAccountById(id: string): Promise<TradingAccountDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "id is required" }]);
  }

  try {
    const record = await prisma.tradingAccount.findFirst({
      where: { id, userId },
    });

    if (!record) {
      throw createNotFoundError("TradingAccount");
    }

    return toTradingAccountDto(record);
  } catch (err) {
    if (err instanceof Error && err.name === "TradeServiceError") throw err;
    throw createDatabaseError(err);
  }
}

/**
 * Lists TradingAccounts for the authenticated user with filters and pagination.
 */
export async function listTradingAccounts(
  options: ListTradingAccountsOptions = {},
): Promise<TradingAccountListResult> {
  const userId = await resolveUserId();

  const filters = options.filters ?? {};
  const sort = options.sort ?? defaultSort();
  const pagination = normalizePagination(options.pagination);

  const where = buildAccountWhere(userId, filters);
  const orderBy = buildOrderBy(sort);
  const skip = (pagination.page - 1) * pagination.pageSize;
  const take = pagination.pageSize;

  try {
    const [items, total] = await prisma.$transaction([
      prisma.tradingAccount.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.tradingAccount.count({ where }),
    ]);

    return {
      items: items.map(toTradingAccountDto),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  } catch (err) {
    throw createDatabaseError(err);
  }
}

/**
 * Updates a TradingAccount owned by the authenticated user.
 */
export async function updateTradingAccount(
  id: string,
  input: UpdateTradingAccountInput,
): Promise<TradingAccountDto> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "id is required" }]);
  }

  const validation = validateUpdateTradingAccountInput(input);
  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  let existing;
  try {
    existing = await prisma.tradingAccount.findFirst({ where: { id, userId } });
  } catch (err) {
    throw createDatabaseError(err);
  }

  if (!existing) {
    throw createNotFoundError("TradingAccount");
  }

  const data: Prisma.TradingAccountUpdateInput = {};

  if (input.name !== undefined) data.name = input.name.trim();
  if (input.type !== undefined) data.type = input.type;
  if (input.currency !== undefined) data.currency = input.currency;
  if (input.initialBalance !== undefined) {
    data.initialBalance = decimalFromString(input.initialBalance);
  }
  if (input.currentBalance !== undefined) {
    data.currentBalance = decimalFromString(input.currentBalance);
  }
  if (input.isActive !== undefined) data.isActive = input.isActive;

  try {
    const record = await prisma.tradingAccount.update({
      where: { id },
      data,
    });
    return toTradingAccountDto(record);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

/**
 * Deletes a TradingAccount owned by the authenticated user.
 */
export async function deleteTradingAccount(id: string): Promise<void> {
  const userId = await resolveUserId();

  if (!id || typeof id !== "string") {
    throw createValidationError([{ path: "id", message: "id is required" }]);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.tradingAccount.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!existing) return false;
      await tx.tradingAccount.delete({ where: { id } });
      return true;
    });

    if (!result) {
      throw createNotFoundError("TradingAccount");
    }
  } catch (err) {
    if (err instanceof Error && err.name === "TradeServiceError") throw err;
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      throw createValidationError([
        {
          path: "id",
          message:
            "Cannot delete account with associated trades. Deactivate it instead.",
        },
      ]);
    }
    throw createDatabaseError(err);
  }
}
