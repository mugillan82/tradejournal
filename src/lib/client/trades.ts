/**
 * Client Data Layer — Trades & Accounts
 *
 * Centralized data access layer for browser components consuming the
 * authoritative backend API (`/api/trades` and `/api/trading-accounts`).
 *
 * Enforces typed parameter serialization, safe error parsing, and
 * prevents Prisma/database internal leaks.
 */

import type {
  TradeDto,
  TradeListFilters,
  TradeListResult,
  TradeListSort,
  TradeListPagination,
} from "@/lib/trading/trade/types";

import type { TradingAccountDto } from "@/lib/trading/account/types";

export class TradeClientApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: ReadonlyArray<{ path: string; message: string }>;

  constructor(
    message: string,
    status: number = 500,
    code: string = "API_ERROR",
    fieldErrors?: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "TradeClientApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export interface FetchTradesOptions {
  readonly filters?: TradeListFilters;
  readonly sort?: TradeListSort;
  readonly pagination?: TradeListPagination;
  readonly signal?: AbortSignal;
}

/**
 * Builds the URLSearchParams object for `GET /api/trades`.
 */
export function buildTradesQueryString(options: FetchTradesOptions = {}): string {
  const params = new URLSearchParams();
  const { filters, sort, pagination } = options;

  if (filters) {
    if (filters.ids && filters.ids.length > 0) {
      params.set("ids", filters.ids.join(","));
    }
    if (filters.tradingAccountId) {
      params.set("tradingAccountId", filters.tradingAccountId);
    }
    if (filters.side) {
      params.set("side", filters.side);
    }
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        if (filters.status.length > 0) {
          params.set("status", filters.status.join(","));
        }
      } else {
        params.set("status", String(filters.status));
      }
    }
    if (filters.entryDateFrom) {
      params.set("entryDateFrom", filters.entryDateFrom.toISOString());
    }
    if (filters.entryDateTo) {
      params.set("entryDateTo", filters.entryDateTo.toISOString());
    }
    if (filters.exitDateFrom) {
      params.set("exitDateFrom", filters.exitDateFrom.toISOString());
    }
    if (filters.exitDateTo) {
      params.set("exitDateTo", filters.exitDateTo.toISOString());
    }
    if (filters.search && filters.search.trim() !== "") {
      params.set("search", filters.search.trim());
    }
  }

  if (sort) {
    params.set("sortField", sort.field);
    params.set("sortDirection", sort.direction);
  }

  if (pagination) {
    params.set("page", String(pagination.page));
    params.set("pageSize", String(pagination.pageSize));
  }

  return params.toString();
}

/**
 * Fetches paginated trades matching given filters and sort options.
 */
export async function fetchTrades(
  options: FetchTradesOptions = {},
): Promise<TradeListResult> {
  const queryString = buildTradesQueryString(options);
  const url = `/api/trades${queryString ? `?${queryString}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: options.signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string; fieldErrors?: Array<{ path: string; message: string }> } } = {};
      try {
        errBody = await res.json();
      } catch {
        // Response was not JSON
      }

      const message = errBody?.error?.message || `Failed to fetch trades (${res.status})`;
      const code = errBody?.error?.code || "API_ERROR";
      const fieldErrors = errBody?.error?.fieldErrors;

      throw new TradeClientApiError(message, res.status, code, fieldErrors);
    }

    const data = await res.json();

    // Rehydrate ISO strings to Date objects if needed, preserving precision
    const items = (data.items || []).map((t: TradeDto) => ({
      ...t,
      entryDate: new Date(t.entryDate),
      exitDate: t.exitDate ? new Date(t.exitDate) : null,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    }));

    return {
      items,
      total: data.total ?? items.length,
      page: data.page ?? 1,
      pageSize: data.pageSize ?? 50,
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "Network error occurred while fetching trades";
    throw new TradeClientApiError(msg, 500, "NETWORK_ERROR");
  }
}

/**
 * Fetches a single trade by ID.
 */
export async function fetchTradeById(id: string, signal?: AbortSignal): Promise<TradeDto> {
  if (!id) {
    throw new TradeClientApiError("Trade ID is required", 400, "VALIDATION");
  }

  try {
    const res = await fetch(`/api/trades/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      const message = errBody?.error?.message || `Failed to fetch trade (${res.status})`;
      const code = errBody?.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR");
      throw new TradeClientApiError(message, res.status, code);
    }

    const data = await res.json();
    return {
      ...data,
      entryDate: new Date(data.entryDate),
      exitDate: data.exitDate ? new Date(data.exitDate) : null,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Unable to load trade details", 500, "NETWORK_ERROR");
  }
}

/**
 * Fetches list of user's active trading accounts for filter selections.
 */
export async function fetchTradingAccounts(signal?: AbortSignal): Promise<ReadonlyArray<TradingAccountDto>> {
  try {
    const res = await fetch("/api/trading-accounts?pageSize=200", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

/**
 * Payload contract for creating a trade via the client layer.
 * Values are stringified decimals and serialized ISO dates.
 */
export interface CreateTradeClientInput {
  readonly tradingAccountId: string;
  readonly side: TradeDto["side"];
  readonly entryPrice: string;
  readonly entryDate: Date | string;
  readonly exitPrice?: string | null;
  readonly exitDate?: Date | string | null;
  readonly stopLoss?: string | null;
  readonly takeProfit?: string | null;
  readonly riskAmount?: string | null;
  readonly plannedRiskReward?: string | null;
  readonly quantity: string;
  readonly commission?: string | null;
  readonly fees?: string | null;
  readonly swap?: string | null;
  readonly grossPnl?: string | null;
  readonly netPnl?: string | null;
  readonly status?: TradeDto["status"];
  readonly title?: string | null;
  readonly notes?: string | null;
  readonly strategyId?: string | null;
  readonly setupId?: string | null;
}

/**
 * Creates a new trade record by posting to `POST /api/trades`.
 */
export async function createTradeClient(
  input: CreateTradeClientInput,
  signal?: AbortSignal,
): Promise<TradeDto> {
  const payload = {
    ...input,
    entryDate:
      input.entryDate instanceof Date
        ? input.entryDate.toISOString()
        : input.entryDate,
    exitDate:
      input.exitDate instanceof Date
        ? input.exitDate.toISOString()
        : input.exitDate ?? null,
  };

  try {
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let errBody: {
        error?: {
          message?: string;
          code?: string;
          fieldErrors?: Array<{ path: string; message: string }>;
        };
      } = {};
      try {
        errBody = await res.json();
      } catch {
        // Non-JSON response
      }

      const message =
        errBody?.error?.message || `Failed to create trade (${res.status})`;
      const code = errBody?.error?.code || "API_ERROR";
      const fieldErrors = errBody?.error?.fieldErrors;

      throw new TradeClientApiError(message, res.status, code, fieldErrors);
    }

    const data = await res.json();
    return {
      ...data,
      entryDate: new Date(data.entryDate),
      exitDate: data.exitDate ? new Date(data.exitDate) : null,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    const msg =
      err instanceof Error
        ? err.message
        : "Network error occurred while creating trade";
    throw new TradeClientApiError(msg, 500, "NETWORK_ERROR");
  }
}
/**
 * Payload contract for updating a trade via the client layer.
 * All fields are optional.
 */
export interface UpdateTradeClientInput {
  readonly side?: TradeDto["side"];
  readonly entryPrice?: string;
  readonly entryDate?: Date | string;
  readonly exitPrice?: string | null;
  readonly exitDate?: Date | string | null;
  readonly stopLoss?: string | null;
  readonly takeProfit?: string | null;
  readonly riskAmount?: string | null;
  readonly plannedRiskReward?: string | null;
  readonly quantity?: string;
  readonly commission?: string | null;
  readonly fees?: string | null;
  readonly swap?: string | null;
  readonly grossPnl?: string | null;
  readonly netPnl?: string | null;
  readonly status?: TradeDto["status"];
  readonly title?: string | null;
  readonly notes?: string | null;
  readonly strategyId?: string | null;
  readonly setupId?: string | null;
}

/**
 * Updates an existing trade by sending a PATCH request to `/api/trades/[id]`.
 */
export async function updateTradeClient(
  id: string,
  input: UpdateTradeClientInput,
  signal?: AbortSignal,
): Promise<TradeDto> {
  const payload: Record<string, unknown> = { ...input };

  if (input.entryDate !== undefined) {
    payload.entryDate =
      input.entryDate instanceof Date
        ? input.entryDate.toISOString()
        : input.entryDate;
  }
  if (input.exitDate !== undefined) {
    payload.exitDate =
      input.exitDate instanceof Date
        ? input.exitDate.toISOString()
        : input.exitDate;
  }

  try {
    const res = await fetch(`/api/trades/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let errBody: {
        error?: {
          message?: string;
          code?: string;
          fieldErrors?: Array<{ path: string; message: string }>;
        };
      } = {};
      try {
        errBody = await res.json();
      } catch {
        // Non-JSON response
      }

      const message =
        errBody?.error?.message || `Failed to update trade (${res.status})`;
      const code = errBody?.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR");
      const fieldErrors = errBody?.error?.fieldErrors;

      throw new TradeClientApiError(message, res.status, code, fieldErrors);
    }

    const data = await res.json();
    return {
      ...data,
      entryDate: new Date(data.entryDate),
      exitDate: data.exitDate ? new Date(data.exitDate) : null,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    const msg =
      err instanceof Error
        ? err.message
        : "Network error occurred while updating trade";
    throw new TradeClientApiError(msg, 500, "NETWORK_ERROR");
  }
}

/**
 * Deletes a trade by sending a DELETE request to `/api/trades/[id]`.
 */
export async function deleteTradeClient(
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const res = await fetch(`/api/trades/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
      signal,
    });

    if (!res.ok) {
      let errBody: {
        error?: {
          message?: string;
          code?: string;
        };
      } = {};
      try {
        errBody = await res.json();
      } catch {
        // Non-JSON response
      }

      const message =
        errBody?.error?.message || `Failed to delete trade (${res.status})`;
      const code = errBody?.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR");

      throw new TradeClientApiError(message, res.status, code);
    }
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    const msg =
      err instanceof Error
        ? err.message
        : "Network error occurred while deleting trade";
    throw new TradeClientApiError(msg, 500, "NETWORK_ERROR");
  }
}

// ---------------------------------------------------------------------------
// Attachment Client Data Layer
// ---------------------------------------------------------------------------

export interface AttachmentClientDto {
  readonly id: string;
  readonly tradeId: string | null;
  readonly journalEntryId: string | null;
  readonly fileName: string;
  readonly fileUrl: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly uploadedAt: Date;
}

/**
 * Fetches all attachments for a specific trade.
 */
export async function fetchTradeAttachments(
  tradeId: string,
  signal?: AbortSignal,
): Promise<ReadonlyArray<AttachmentClientDto>> {
  if (!tradeId) {
    throw new TradeClientApiError("Trade ID is required", 400, "VALIDATION");
  }

  try {
    const res = await fetch(`/api/trades/${encodeURIComponent(tradeId)}/attachments`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string } } = {};
      try {
        errBody = await res.json();
      } catch {
        // Non-JSON response
      }
      const message =
        errBody?.error?.message || `Failed to fetch attachments (${res.status})`;
      const code =
        errBody?.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR");
      throw new TradeClientApiError(message, res.status, code);
    }

    const data = await res.json();
    return (data || []).map((att: AttachmentClientDto) => ({
      ...att,
      uploadedAt: new Date(att.uploadedAt),
    }));
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    const msg =
      err instanceof Error
        ? err.message
        : "Network error occurred while fetching attachments";
    throw new TradeClientApiError(msg, 500, "NETWORK_ERROR");
  }
}

/**
 * Uploads an attachment for a trade using multipart/form-data.
 */
export async function uploadTradeAttachment(
  tradeId: string,
  file: File,
  signal?: AbortSignal,
): Promise<AttachmentClientDto> {
  if (!tradeId) {
    throw new TradeClientApiError("Trade ID is required", 400, "VALIDATION");
  }
  if (!file) {
    throw new TradeClientApiError("File is required", 400, "VALIDATION");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`/api/trades/${encodeURIComponent(tradeId)}/attachments`, {
      method: "POST",
      body: formData,
      signal,
    });

    if (!res.ok) {
      let errBody: {
        error?: {
          message?: string;
          code?: string;
          fieldErrors?: Array<{ path: string; message: string }>;
        };
      } = {};
      try {
        errBody = await res.json();
      } catch {
        // Non-JSON response
      }
      const message =
        errBody?.error?.message || `Failed to upload attachment (${res.status})`;
      const code = errBody?.error?.code || "API_ERROR";
      const fieldErrors = errBody?.error?.fieldErrors;

      throw new TradeClientApiError(message, res.status, code, fieldErrors);
    }

    const data = await res.json();
    return {
      ...data,
      uploadedAt: new Date(data.uploadedAt),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    const msg =
      err instanceof Error
        ? err.message
        : "Network error occurred while uploading attachment";
    throw new TradeClientApiError(msg, 500, "NETWORK_ERROR");
  }
}

/**
 * Deletes an attachment from a trade.
 */
export async function deleteTradeAttachment(
  tradeId: string,
  attachmentId: string,
  signal?: AbortSignal,
): Promise<void> {
  if (!tradeId) {
    throw new TradeClientApiError("Trade ID is required", 400, "VALIDATION");
  }
  if (!attachmentId) {
    throw new TradeClientApiError("Attachment ID is required", 400, "VALIDATION");
  }

  try {
    const res = await fetch(
      `/api/trades/${encodeURIComponent(tradeId)}/attachments/${encodeURIComponent(attachmentId)}`,
      {
        method: "DELETE",
        headers: { Accept: "application/json" },
        signal,
      },
    );

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string } } = {};
      try {
        errBody = await res.json();
      } catch {
        // Non-JSON response
      }
      const message =
        errBody?.error?.message || `Failed to delete attachment (${res.status})`;
      const code =
        errBody?.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR");

      throw new TradeClientApiError(message, res.status, code);
    }
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    const msg =
      err instanceof Error
        ? err.message
        : "Network error occurred while deleting attachment";
    throw new TradeClientApiError(msg, 500, "NETWORK_ERROR");
  }
}

// ---------------------------------------------------------------------------
// Journal & Trade Notes & Reviews Client Layer
// ---------------------------------------------------------------------------

import type {
  JournalMoodValue,
  JournalEntryDto,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  JournalEntryListFilters,
  JournalEntryListResult,
  TradeNoteDto,
  CreateTradeNoteInput,
  UpdateTradeNoteInput,
  ReviewDto,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewListFilters,
  ReviewListResult,
} from "@/lib/trading/journal/types";

export type {
  JournalMoodValue,
  JournalEntryDto,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  JournalEntryListFilters,
  JournalEntryListResult,
  TradeNoteDto,
  CreateTradeNoteInput,
  UpdateTradeNoteInput,
  ReviewDto,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewListFilters,
  ReviewListResult,
};

/**
 * Lists journal entries with optional date/mood filters.
 */
export async function fetchJournalEntries(
  filters: JournalEntryListFilters = {},
  page = 1,
  pageSize = 50,
  signal?: AbortSignal,
): Promise<JournalEntryListResult> {
  const params = new URLSearchParams();
  if (filters.fromDate) params.set("fromDate", filters.fromDate.toISOString());
  if (filters.toDate) params.set("toDate", filters.toDate.toISOString());
  if (filters.mood) params.set("mood", filters.mood);
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());

  try {
    const res = await fetch(`/api/journal?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to fetch journal entries (${res.status})`,
        res.status,
        errBody.error?.code || "API_ERROR",
      );
    }

    const data = await res.json();
    return {
      ...data,
      items: (data.items || []).map((item: JournalEntryDto) => ({
        ...item,
        entryDate: new Date(item.entryDate),
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while fetching journal entries", 500, "NETWORK_ERROR");
  }
}

/**
 * Creates a new daily journal entry.
 */
export async function createJournalEntryClient(
  input: CreateJournalEntryInput,
  signal?: AbortSignal,
): Promise<JournalEntryDto> {
  try {
    const payload = {
      ...input,
      entryDate: input.entryDate instanceof Date ? input.entryDate.toISOString() : input.entryDate,
    };

    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string; fieldErrors?: Array<{ path: string; message: string }> } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to create journal entry (${res.status})`,
        res.status,
        errBody.error?.code || "API_ERROR",
        errBody.error?.fieldErrors,
      );
    }

    const item = await res.json();
    return {
      ...item,
      entryDate: new Date(item.entryDate),
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while creating journal entry", 500, "NETWORK_ERROR");
  }
}

/**
 * Updates an existing daily journal entry.
 */
export async function updateJournalEntryClient(
  id: string,
  input: UpdateJournalEntryInput,
  signal?: AbortSignal,
): Promise<JournalEntryDto> {
  try {
    const res = await fetch(`/api/journal/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string; fieldErrors?: Array<{ path: string; message: string }> } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to update journal entry (${res.status})`,
        res.status,
        errBody.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR"),
        errBody.error?.fieldErrors,
      );
    }

    const item = await res.json();
    return {
      ...item,
      entryDate: new Date(item.entryDate),
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while updating journal entry", 500, "NETWORK_ERROR");
  }
}

/**
 * Deletes a journal entry by ID.
 */
export async function deleteJournalEntryClient(id: string, signal?: AbortSignal): Promise<void> {
  try {
    const res = await fetch(`/api/journal/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to delete journal entry (${res.status})`,
        res.status,
        errBody.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR"),
      );
    }
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while deleting journal entry", 500, "NETWORK_ERROR");
  }
}

// ---------------------------------------------------------------------------
// Trade Notes Client Layer
// ---------------------------------------------------------------------------

/**
 * Fetches all notes for a specific trade.
 */
export async function fetchTradeNotes(tradeId: string, signal?: AbortSignal): Promise<ReadonlyArray<TradeNoteDto>> {
  try {
    const res = await fetch(`/api/trades/${encodeURIComponent(tradeId)}/notes`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to fetch trade notes (${res.status})`,
        res.status,
        errBody.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR"),
      );
    }

    const data = await res.json();
    return (data || []).map((n: TradeNoteDto) => ({
      ...n,
      createdAt: new Date(n.createdAt),
    }));
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while fetching trade notes", 500, "NETWORK_ERROR");
  }
}

/**
 * Adds a new note to a trade.
 */
export async function createTradeNoteClient(
  tradeId: string,
  content: string,
  signal?: AbortSignal,
): Promise<TradeNoteDto> {
  try {
    const res = await fetch(`/api/trades/${encodeURIComponent(tradeId)}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ content }),
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string; fieldErrors?: Array<{ path: string; message: string }> } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to add trade note (${res.status})`,
        res.status,
        errBody.error?.code || "API_ERROR",
        errBody.error?.fieldErrors,
      );
    }

    const data = await res.json();
    return {
      ...data,
      createdAt: new Date(data.createdAt),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while creating trade note", 500, "NETWORK_ERROR");
  }
}

/**
 * Updates a trade note.
 */
export async function updateTradeNoteClient(
  tradeId: string,
  noteId: string,
  content: string,
  signal?: AbortSignal,
): Promise<TradeNoteDto> {
  try {
    const res = await fetch(
      `/api/trades/${encodeURIComponent(tradeId)}/notes/${encodeURIComponent(noteId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ content }),
        signal,
      },
    );

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string; fieldErrors?: Array<{ path: string; message: string }> } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to update trade note (${res.status})`,
        res.status,
        errBody.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR"),
        errBody.error?.fieldErrors,
      );
    }

    const data = await res.json();
    return {
      ...data,
      createdAt: new Date(data.createdAt),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while updating trade note", 500, "NETWORK_ERROR");
  }
}

/**
 * Deletes a trade note.
 */
export async function deleteTradeNoteClient(
  tradeId: string,
  noteId: string,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const res = await fetch(
      `/api/trades/${encodeURIComponent(tradeId)}/notes/${encodeURIComponent(noteId)}`,
      {
        method: "DELETE",
        headers: { Accept: "application/json" },
        signal,
      },
    );

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to delete trade note (${res.status})`,
        res.status,
        errBody.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR"),
      );
    }
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while deleting trade note", 500, "NETWORK_ERROR");
  }
}

// ---------------------------------------------------------------------------
// Trade Reviews Client Layer
// ---------------------------------------------------------------------------

/**
 * Fetches all reviews with optional date range or search filter.
 */
export async function fetchReviews(
  filters: ReviewListFilters = {},
  page = 1,
  pageSize = 50,
  signal?: AbortSignal,
): Promise<ReviewListResult> {
  const params = new URLSearchParams();
  if (filters.fromDate) params.set("fromDate", filters.fromDate.toISOString());
  if (filters.toDate) params.set("toDate", filters.toDate.toISOString());
  if (filters.search) params.set("search", filters.search);
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());

  try {
    const res = await fetch(`/api/reviews?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to fetch reviews (${res.status})`,
        res.status,
        errBody.error?.code || "API_ERROR",
      );
    }

    const data = await res.json();
    return {
      ...data,
      items: (data.items || []).map((r: ReviewDto) => ({
        ...r,
        reviewDate: new Date(r.reviewDate),
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      })),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while fetching reviews", 500, "NETWORK_ERROR");
  }
}

/**
 * Creates a new trade review.
 */
export async function createReviewClient(
  input: CreateReviewInput,
  signal?: AbortSignal,
): Promise<ReviewDto> {
  try {
    const payload = {
      ...input,
      reviewDate: input.reviewDate instanceof Date ? input.reviewDate.toISOString() : input.reviewDate,
    };

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string; fieldErrors?: Array<{ path: string; message: string }> } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to create review (${res.status})`,
        res.status,
        errBody.error?.code || "API_ERROR",
        errBody.error?.fieldErrors,
      );
    }

    const data = await res.json();
    return {
      ...data,
      reviewDate: new Date(data.reviewDate),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while creating review", 500, "NETWORK_ERROR");
  }
}

/**
 * Updates a trade review.
 */
export async function updateReviewClient(
  id: string,
  input: UpdateReviewInput,
  signal?: AbortSignal,
): Promise<ReviewDto> {
  try {
    const payload: Record<string, unknown> = { ...input };
    if (input.reviewDate !== undefined) {
      payload.reviewDate =
        input.reviewDate instanceof Date ? input.reviewDate.toISOString() : input.reviewDate;
    }

    const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string; fieldErrors?: Array<{ path: string; message: string }> } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to update review (${res.status})`,
        res.status,
        errBody.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR"),
        errBody.error?.fieldErrors,
      );
    }

    const data = await res.json();
    return {
      ...data,
      reviewDate: new Date(data.reviewDate),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while updating review", 500, "NETWORK_ERROR");
  }
}

/**
 * Deletes a review by ID.
 */
export async function deleteReviewClient(id: string, signal?: AbortSignal): Promise<void> {
  try {
    const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      let errBody: { error?: { message?: string; code?: string } } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      throw new TradeClientApiError(
        errBody.error?.message || `Failed to delete review (${res.status})`,
        res.status,
        errBody.error?.code || (res.status === 404 ? "NOT_FOUND" : "API_ERROR"),
      );
    }
  } catch (err: unknown) {
    if (err instanceof TradeClientApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new TradeClientApiError("Network error occurred while deleting review", 500, "NETWORK_ERROR");
  }
}



