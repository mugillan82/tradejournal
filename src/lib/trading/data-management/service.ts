import "server-only";

import { prisma } from "@/lib/db/client";
import { requireServerUserId } from "@/lib/auth/session";
import { generateCsv } from "./csv";
import {
  DataManagementOverviewDto,
  ExportFilterInput,
  ExportResultDto,
  FullBackupDto,
} from "./types";
import {
  DataManagementServiceError,
  ExportUnauthorizedError,
} from "./errors";

/**
 * Retrieves user-scoped counts for data overview.
 */
export async function getDataManagementOverview(): Promise<DataManagementOverviewDto> {
  const userId = await requireServerUserId();
  if (!userId) {
    throw new ExportUnauthorizedError("Authentication required to view data overview");
  }

  try {
    const [
      accountsCount,
      tradesCount,
      executionsCount,
      journalEntriesCount,
      tradeNotesCount,
      reviewsCount,
      attachmentsCount,
      tagsCount,
      strategiesCount,
      setupsCount,
      mistakesCount,
    ] = await Promise.all([
      prisma.tradingAccount.count({ where: { userId } }),
      prisma.trade.count({ where: { userId } }),
      prisma.execution.count({ where: { trade: { userId } } }),
      prisma.journalEntry.count({ where: { userId } }),
      prisma.tradeNote.count({ where: { trade: { userId } } }),
      prisma.review.count({ where: { userId } }),
      prisma.attachment.count({
        where: {
          OR: [{ trade: { userId } }, { journalEntry: { userId } }],
        },
      }),
      prisma.tag.count(),
      prisma.strategy.count(),
      prisma.setup.count(),
      prisma.mistake.count(),
    ]);

    return {
      accounts: accountsCount,
      trades: tradesCount,
      executions: executionsCount,
      journalEntries: journalEntriesCount,
      tradeNotes: tradeNotesCount,
      reviews: reviewsCount,
      tags: tagsCount,
      strategies: strategiesCount,
      setups: setupsCount,
      mistakes: mistakesCount,
      attachments: attachmentsCount,
    };
  } catch (error) {
    if (error instanceof DataManagementServiceError) {
      throw error;
    }
    throw new DataManagementServiceError(
      "Failed to fetch data management overview counts",
      "OVERVIEW_FETCH_FAILED",
      500
    );
  }
}

/**
 * Exports trades in CSV or JSON format.
 */
export async function exportTrades(filters: ExportFilterInput): Promise<ExportResultDto> {
  const userId = await requireServerUserId();
  if (!userId) {
    throw new ExportUnauthorizedError("Authentication required for trade export");
  }

  try {
    const whereClause: Record<string, unknown> = { userId };
    if (filters.accountId) {
      whereClause.tradingAccountId = filters.accountId;
    }
    if (filters.from || filters.to) {
      const entryDateFilter: Record<string, unknown> = {};
      if (filters.from) entryDateFilter.gte = new Date(filters.from);
      if (filters.to) entryDateFilter.lte = new Date(filters.to);
      whereClause.entryDate = entryDateFilter;
    }

    const trades = await prisma.trade.findMany({
      where: whereClause,
      orderBy: { entryDate: "desc" },
      include: {
        tradingAccount: { select: { id: true, name: true, currency: true } },
        strategy: { select: { id: true, name: true } },
        setup: { select: { id: true, name: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
        mistakes: { include: { mistake: { select: { id: true, name: true } } } },
      },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (filters.format === "json") {
      const formatted = trades.map((t) => ({
        id: t.id,
        accountId: t.tradingAccountId,
        accountName: t.tradingAccount.name,
        accountCurrency: t.tradingAccount.currency,
        title: t.title,
        side: t.side,
        status: t.status,
        entryDate: t.entryDate.toISOString(),
        exitDate: t.exitDate ? t.exitDate.toISOString() : null,
        entryPrice: t.entryPrice.toString(),
        exitPrice: t.exitPrice ? t.exitPrice.toString() : null,
        quantity: t.quantity.toString(),
        stopLoss: t.stopLoss ? t.stopLoss.toString() : null,
        takeProfit: t.takeProfit ? t.takeProfit.toString() : null,
        riskAmount: t.riskAmount ? t.riskAmount.toString() : null,
        plannedRiskReward: t.plannedRiskReward ? t.plannedRiskReward.toString() : null,
        actualRMultiple: t.actualRMultiple ? t.actualRMultiple.toString() : null,
        grossPnl: t.grossPnl ? t.grossPnl.toString() : null,
        netPnl: t.netPnl ? t.netPnl.toString() : null,
        commission: t.commission ? t.commission.toString() : null,
        fees: t.fees ? t.fees.toString() : null,
        swap: t.swap ? t.swap.toString() : null,
        strategy: t.strategy?.name ?? null,
        setup: t.setup?.name ?? null,
        tags: t.tags.map((tt) => tt.tag.name),
        mistakes: t.mistakes.map((tm) => tm.mistake.name),
        notes: t.notes,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));

      return {
        data: JSON.stringify(formatted, null, 2),
        filename: `tradejournal-trades-${timestamp}.json`,
        mimeType: "application/json",
        dataset: "trades",
        format: "json",
        recordCount: trades.length,
      };
    }

    // CSV format
    const headers = [
      "Trade ID",
      "Account ID",
      "Account Name",
      "Currency",
      "Title / Symbol",
      "Side",
      "Status",
      "Entry Date",
      "Exit Date",
      "Quantity",
      "Entry Price",
      "Exit Price",
      "Stop Loss",
      "Take Profit",
      "Risk Amount",
      "Planned R:R",
      "Actual R-Multiple",
      "Gross P&L",
      "Net P&L",
      "Commission",
      "Fees",
      "Swap",
      "Strategy",
      "Setup",
      "Tags",
      "Mistakes",
      "Notes",
      "Created At",
      "Updated At",
    ];

    const rows = trades.map((t) => [
      t.id,
      t.tradingAccountId,
      t.tradingAccount.name,
      t.tradingAccount.currency,
      t.title ?? "",
      t.side,
      t.status,
      t.entryDate.toISOString(),
      t.exitDate ? t.exitDate.toISOString() : "",
      t.quantity.toString(),
      t.entryPrice.toString(),
      t.exitPrice ? t.exitPrice.toString() : "",
      t.stopLoss ? t.stopLoss.toString() : "",
      t.takeProfit ? t.takeProfit.toString() : "",
      t.riskAmount ? t.riskAmount.toString() : "",
      t.plannedRiskReward ? t.plannedRiskReward.toString() : "",
      t.actualRMultiple ? t.actualRMultiple.toString() : "",
      t.grossPnl ? t.grossPnl.toString() : "",
      t.netPnl ? t.netPnl.toString() : "",
      t.commission ? t.commission.toString() : "",
      t.fees ? t.fees.toString() : "",
      t.swap ? t.swap.toString() : "",
      t.strategy?.name ?? "",
      t.setup?.name ?? "",
      t.tags.map((tt) => tt.tag.name).join("; "),
      t.mistakes.map((tm) => tm.mistake.name).join("; "),
      t.notes ?? "",
      t.createdAt.toISOString(),
      t.updatedAt.toISOString(),
    ]);

    return {
      data: generateCsv(headers, rows),
      filename: `tradejournal-trades-${timestamp}.csv`,
      mimeType: "text/csv; charset=utf-8",
      dataset: "trades",
      format: "csv",
      recordCount: trades.length,
    };
  } catch (error) {
    if (error instanceof DataManagementServiceError) {
      throw error;
    }
    throw new DataManagementServiceError(
      "Failed to export trades",
      "EXPORT_TRADES_FAILED",
      500
    );
  }
}

/**
 * Exports trading accounts in CSV or JSON format.
 */
export async function exportAccounts(filters: ExportFilterInput): Promise<ExportResultDto> {
  const userId = await requireServerUserId();
  if (!userId) {
    throw new ExportUnauthorizedError("Authentication required for account export");
  }

  try {
    const accounts = await prisma.tradingAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { trades: true },
        },
      },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (filters.format === "json") {
      const formatted = accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        initialBalance: a.initialBalance ? a.initialBalance.toString() : null,
        currentBalance: a.currentBalance ? a.currentBalance.toString() : null,
        isActive: a.isActive,
        tradesCount: a._count.trades,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));

      return {
        data: JSON.stringify(formatted, null, 2),
        filename: `tradejournal-accounts-${timestamp}.json`,
        mimeType: "application/json",
        dataset: "accounts",
        format: "json",
        recordCount: accounts.length,
      };
    }

    const headers = [
      "Account ID",
      "Account Name",
      "Type",
      "Currency",
      "Initial Balance",
      "Current Balance",
      "Active",
      "Total Trades",
      "Created At",
      "Updated At",
    ];

    const rows = accounts.map((a) => [
      a.id,
      a.name,
      a.type,
      a.currency,
      a.initialBalance ? a.initialBalance.toString() : "",
      a.currentBalance ? a.currentBalance.toString() : "",
      a.isActive ? "true" : "false",
      a._count.trades,
      a.createdAt.toISOString(),
      a.updatedAt.toISOString(),
    ]);

    return {
      data: generateCsv(headers, rows),
      filename: `tradejournal-accounts-${timestamp}.csv`,
      mimeType: "text/csv; charset=utf-8",
      dataset: "accounts",
      format: "csv",
      recordCount: accounts.length,
    };
  } catch (error) {
    if (error instanceof DataManagementServiceError) {
      throw error;
    }
    throw new DataManagementServiceError(
      "Failed to export trading accounts",
      "EXPORT_ACCOUNTS_FAILED",
      500
    );
  }
}

/**
 * Exports journal entries in CSV or JSON format.
 */
export async function exportJournal(filters: ExportFilterInput): Promise<ExportResultDto> {
  const userId = await requireServerUserId();
  if (!userId) {
    throw new ExportUnauthorizedError("Authentication required for journal export");
  }

  try {
    const whereClause: Record<string, unknown> = { userId };
    if (filters.from || filters.to) {
      const entryDateFilter: Record<string, unknown> = {};
      if (filters.from) entryDateFilter.gte = new Date(filters.from);
      if (filters.to) entryDateFilter.lte = new Date(filters.to);
      whereClause.entryDate = entryDateFilter;
    }

    const entries = await prisma.journalEntry.findMany({
      where: whereClause,
      orderBy: { entryDate: "desc" },
      include: {
        attachments: { select: { id: true, fileName: true, mimeType: true, fileSize: true } },
      },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (filters.format === "json") {
      const formatted = entries.map((e) => ({
        id: e.id,
        entryDate: e.entryDate.toISOString(),
        mood: e.mood,
        energy: e.energy,
        focus: e.focus,
        notes: e.notes,
        attachments: e.attachments,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }));

      return {
        data: JSON.stringify(formatted, null, 2),
        filename: `tradejournal-journal-${timestamp}.json`,
        mimeType: "application/json",
        dataset: "journal",
        format: "json",
        recordCount: entries.length,
      };
    }

    const headers = [
      "Journal ID",
      "Entry Date",
      "Mood",
      "Energy (1-5)",
      "Focus (1-5)",
      "Notes",
      "Attachments Count",
      "Created At",
      "Updated At",
    ];

    const rows = entries.map((e) => [
      e.id,
      e.entryDate.toISOString(),
      e.mood ?? "",
      e.energy ?? "",
      e.focus ?? "",
      e.notes ?? "",
      e.attachments.length,
      e.createdAt.toISOString(),
      e.updatedAt.toISOString(),
    ]);

    return {
      data: generateCsv(headers, rows),
      filename: `tradejournal-journal-${timestamp}.csv`,
      mimeType: "text/csv; charset=utf-8",
      dataset: "journal",
      format: "csv",
      recordCount: entries.length,
    };
  } catch (error) {
    if (error instanceof DataManagementServiceError) {
      throw error;
    }
    throw new DataManagementServiceError(
      "Failed to export journal entries",
      "EXPORT_JOURNAL_FAILED",
      500
    );
  }
}

/**
 * Generates a full structured JSON backup of user-owned journal and trading data.
 * Does NOT include authentication secrets, passwords, or sessions.
 * Attachments are included as metadata records only (not raw binary content).
 */
export async function exportFullBackup(): Promise<ExportResultDto> {
  const userId = await requireServerUserId();
  if (!userId) {
    throw new ExportUnauthorizedError("Authentication required for full backup export");
  }

  try {
    const [
      accounts,
      trades,
      journalEntries,
      reviews,
      tags,
      strategies,
      setups,
      mistakes,
    ] = await Promise.all([
      prisma.tradingAccount.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.trade.findMany({
        where: { userId },
        orderBy: { entryDate: "asc" },
        include: {
          executions: { orderBy: { datetime: "asc" } },
          tags: { include: { tag: true } },
          mistakes: { include: { mistake: true } },
          tradeNotes: { orderBy: { createdAt: "asc" } },
          attachments: { select: { id: true, fileName: true, mimeType: true, fileSize: true, uploadedAt: true } },
        },
      }),
      prisma.journalEntry.findMany({
        where: { userId },
        orderBy: { entryDate: "asc" },
        include: {
          attachments: { select: { id: true, fileName: true, mimeType: true, fileSize: true, uploadedAt: true } },
        },
      }),
      prisma.review.findMany({
        where: { userId },
        orderBy: { reviewDate: "asc" },
        include: {
          trades: true,
        },
      }),
      prisma.tag.findMany({ orderBy: { name: "asc" } }),
      prisma.strategy.findMany({ orderBy: { name: "asc" } }),
      prisma.setup.findMany({ orderBy: { name: "asc" } }),
      prisma.mistake.findMany({ orderBy: { name: "asc" } }),
    ]);

    // Flatten executions and trade notes for structured relational representation
    const executions = trades.flatMap((t) =>
      t.executions.map((e) => ({
        id: e.id,
        tradeId: t.id,
        side: e.side,
        price: e.price.toString(),
        quantity: e.quantity.toString(),
        datetime: e.datetime.toISOString(),
        commission: e.commission ? e.commission.toString() : null,
        createdAt: e.createdAt.toISOString(),
      }))
    );

    const tradeNotes = trades.flatMap((t) =>
      t.tradeNotes.map((n) => ({
        id: n.id,
        tradeId: t.id,
        content: n.content,
        createdAt: n.createdAt.toISOString(),
      }))
    );

    const attachments = [
      ...trades.flatMap((t) =>
        t.attachments.map((a) => ({
          id: a.id,
          tradeId: t.id,
          journalEntryId: null,
          fileName: a.fileName,
          mimeType: a.mimeType,
          fileSize: a.fileSize,
          uploadedAt: a.uploadedAt.toISOString(),
        }))
      ),
      ...journalEntries.flatMap((j) =>
        j.attachments.map((a) => ({
          id: a.id,
          tradeId: null,
          journalEntryId: j.id,
          fileName: a.fileName,
          mimeType: a.mimeType,
          fileSize: a.fileSize,
          uploadedAt: a.uploadedAt.toISOString(),
        }))
      ),
    ];

    const backup: FullBackupDto = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        initialBalance: a.initialBalance ? a.initialBalance.toString() : null,
        currentBalance: a.currentBalance ? a.currentBalance.toString() : null,
        isActive: a.isActive,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      trades: trades.map((t) => ({
        id: t.id,
        tradingAccountId: t.tradingAccountId,
        side: t.side,
        entryPrice: t.entryPrice.toString(),
        entryDate: t.entryDate.toISOString(),
        exitPrice: t.exitPrice ? t.exitPrice.toString() : null,
        exitDate: t.exitDate ? t.exitDate.toISOString() : null,
        stopLoss: t.stopLoss ? t.stopLoss.toString() : null,
        takeProfit: t.takeProfit ? t.takeProfit.toString() : null,
        riskAmount: t.riskAmount ? t.riskAmount.toString() : null,
        plannedRiskReward: t.plannedRiskReward ? t.plannedRiskReward.toString() : null,
        actualRMultiple: t.actualRMultiple ? t.actualRMultiple.toString() : null,
        quantity: t.quantity.toString(),
        grossPnl: t.grossPnl ? t.grossPnl.toString() : null,
        netPnl: t.netPnl ? t.netPnl.toString() : null,
        commission: t.commission ? t.commission.toString() : null,
        fees: t.fees ? t.fees.toString() : null,
        swap: t.swap ? t.swap.toString() : null,
        status: t.status,
        title: t.title,
        notes: t.notes,
        strategyId: t.strategyId,
        setupId: t.setupId,
        tagIds: t.tags.map((tt) => tt.tagId),
        mistakeIds: t.mistakes.map((tm) => tm.mistakeId),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      executions,
      tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color, createdAt: t.createdAt.toISOString() })),
      strategies: strategies.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      setups: setups.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        createdAt: s.createdAt.toISOString(),
      })),
      mistakes: mistakes.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        createdAt: m.createdAt.toISOString(),
      })),
      journalEntries: journalEntries.map((j) => ({
        id: j.id,
        entryDate: j.entryDate.toISOString(),
        mood: j.mood,
        energy: j.energy,
        focus: j.focus,
        notes: j.notes,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
      })),
      tradeNotes,
      reviews: reviews.map((r) => ({
        id: r.id,
        title: r.title,
        reviewDate: r.reviewDate.toISOString(),
        notes: r.notes,
        rating: r.rating,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        trades: r.trades.map((rt) => ({
          tradeId: rt.tradeId,
          notes: rt.notes,
          rating: rt.rating,
        })),
      })),
      attachments,
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const totalRecords =
      backup.accounts.length +
      backup.trades.length +
      backup.executions.length +
      backup.journalEntries.length +
      backup.tradeNotes.length +
      backup.reviews.length;

    return {
      data: JSON.stringify(backup, null, 2),
      filename: `tradejournal-full-backup-${timestamp}.json`,
      mimeType: "application/json",
      dataset: "full",
      format: "json",
      recordCount: totalRecords,
    };
  } catch (error) {
    if (error instanceof DataManagementServiceError) {
      throw error;
    }
    throw new DataManagementServiceError(
      "Failed to generate full JSON backup",
      "EXPORT_BACKUP_FAILED",
      500
    );
  }
}

/**
 * Dispatcher function for export queries.
 */
export async function exportData(filters: ExportFilterInput): Promise<ExportResultDto> {
  switch (filters.dataset) {
    case "trades":
      return exportTrades(filters);
    case "accounts":
      return exportAccounts(filters);
    case "journal":
      return exportJournal(filters);
    case "full":
      return exportFullBackup();
    default:
      throw new DataManagementServiceError(
        `Unknown dataset: ${(filters as { dataset: string }).dataset}`,
        "INVALID_DATASET",
        400
      );
  }
}
