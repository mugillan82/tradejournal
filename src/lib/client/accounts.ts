/**
 * Trading Account Domain — Client Data Layer
 *
 * Centralized typed client module for Trading Account management.
 * Handles query serialization, AbortController cancellation, and safe error parsing.
 */

import type {
  TradingAccountDto,
  CreateTradingAccountInput,
  UpdateTradingAccountInput,
  TradingAccountListFilters,
  TradingAccountListSort,
  TradingAccountListPagination,
  TradingAccountListResult,
  TradingAccountTypeValue,
  DecimalString,
} from "../trading/account/types";

export type {
  TradingAccountDto,
  CreateTradingAccountInput,
  UpdateTradingAccountInput,
  TradingAccountListFilters,
  TradingAccountListSort,
  TradingAccountListPagination,
  TradingAccountListResult,
  TradingAccountTypeValue,
  DecimalString,
};

export class TradingAccountClientApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: ReadonlyArray<{ path: string; message: string }>;

  constructor(
    message: string,
    status: number,
    code: string = "INTERNAL_ERROR",
    fieldErrors: ReadonlyArray<{ path: string; message: string }> = [],
  ) {
    super(message);
    this.name = "TradingAccountClientApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export interface ListTradingAccountsClientOptions {
  readonly filters?: TradingAccountListFilters;
  readonly sort?: TradingAccountListSort;
  readonly pagination?: Partial<TradingAccountListPagination>;
}

export function buildAccountsQueryString(
  options: ListTradingAccountsClientOptions = {},
): string {
  const params = new URLSearchParams();

  if (options.filters?.ids && options.filters.ids.length > 0) {
    params.set("ids", options.filters.ids.join(","));
  }
  if (options.filters?.isActive !== undefined) {
    params.set("isActive", String(options.filters.isActive));
  }
  if (options.filters?.currency) {
    params.set("currency", options.filters.currency);
  }
  if (options.filters?.type) {
    params.set("type", options.filters.type);
  }
  if (options.filters?.search) {
    params.set("search", options.filters.search.trim());
  }

  if (options.sort?.field) {
    params.set("sortField", options.sort.field);
  }
  if (options.sort?.direction) {
    params.set("sortDirection", options.sort.direction);
  }

  if (options.pagination?.page && options.pagination.page > 0) {
    params.set("page", String(options.pagination.page));
  }
  if (options.pagination?.pageSize && options.pagination.pageSize > 0) {
    params.set("pageSize", String(options.pagination.pageSize));
  }

  return params.toString();
}

/**
 * Lists trading accounts for the authenticated user.
 */
export async function fetchTradingAccountsClient(
  options: ListTradingAccountsClientOptions = {},
  signal?: AbortSignal,
): Promise<TradingAccountListResult> {
  const qs = buildAccountsQueryString(options);
  const url = qs ? `/api/trading-accounts?${qs}` : "/api/trading-accounts";

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    let errorMsg = `Failed to fetch accounts (status ${response.status})`;
    let errorCode = "FETCH_ERROR";
    let fieldErrors: ReadonlyArray<{ path: string; message: string }> = [];

    try {
      const data = await response.json();
      if (data?.error?.message) errorMsg = data.error.message;
      if (data?.error?.code) errorCode = data.error.code;
      if (Array.isArray(data?.error?.fieldErrors)) fieldErrors = data.error.fieldErrors;
    } catch {
      // Ignore JSON parse error on non-JSON response
    }

    throw new TradingAccountClientApiError(errorMsg, response.status, errorCode, fieldErrors);
  }

  return response.json();
}

/**
 * Retrieves a single trading account by ID.
 */
export async function getTradingAccountClient(
  id: string,
  signal?: AbortSignal,
): Promise<TradingAccountDto> {
  const response = await fetch(`/api/trading-accounts/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    let errorMsg = `Failed to get account (status ${response.status})`;
    let errorCode = "FETCH_ERROR";
    let fieldErrors: ReadonlyArray<{ path: string; message: string }> = [];

    try {
      const data = await response.json();
      if (data?.error?.message) errorMsg = data.error.message;
      if (data?.error?.code) errorCode = data.error.code;
      if (Array.isArray(data?.error?.fieldErrors)) fieldErrors = data.error.fieldErrors;
    } catch {
      // Ignore JSON parse error
    }

    throw new TradingAccountClientApiError(errorMsg, response.status, errorCode, fieldErrors);
  }

  return response.json();
}

/**
 * Creates a new trading account.
 */
export async function createTradingAccountClient(
  input: CreateTradingAccountInput,
): Promise<TradingAccountDto> {
  const response = await fetch("/api/trading-accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMsg = `Failed to create account (status ${response.status})`;
    let errorCode = "CREATE_ERROR";
    let fieldErrors: ReadonlyArray<{ path: string; message: string }> = [];

    try {
      const data = await response.json();
      if (data?.error?.message) errorMsg = data.error.message;
      if (data?.error?.code) errorCode = data.error.code;
      if (Array.isArray(data?.error?.fieldErrors)) fieldErrors = data.error.fieldErrors;
    } catch {
      // Ignore JSON parse error
    }

    throw new TradingAccountClientApiError(errorMsg, response.status, errorCode, fieldErrors);
  }

  return response.json();
}

/**
 * Updates an existing trading account.
 */
export async function updateTradingAccountClient(
  id: string,
  input: UpdateTradingAccountInput,
): Promise<TradingAccountDto> {
  const response = await fetch(`/api/trading-accounts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMsg = `Failed to update account (status ${response.status})`;
    let errorCode = "UPDATE_ERROR";
    let fieldErrors: ReadonlyArray<{ path: string; message: string }> = [];

    try {
      const data = await response.json();
      if (data?.error?.message) errorMsg = data.error.message;
      if (data?.error?.code) errorCode = data.error.code;
      if (Array.isArray(data?.error?.fieldErrors)) fieldErrors = data.error.fieldErrors;
    } catch {
      // Ignore JSON parse error
    }

    throw new TradingAccountClientApiError(errorMsg, response.status, errorCode, fieldErrors);
  }

  return response.json();
}

/**
 * Deletes a trading account by ID.
 */
export async function deleteTradingAccountClient(id: string): Promise<void> {
  const response = await fetch(`/api/trading-accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    let errorMsg = `Failed to delete account (status ${response.status})`;
    let errorCode = "DELETE_ERROR";
    let fieldErrors: ReadonlyArray<{ path: string; message: string }> = [];

    try {
      const data = await response.json();
      if (data?.error?.message) errorMsg = data.error.message;
      if (data?.error?.code) errorCode = data.error.code;
      if (Array.isArray(data?.error?.fieldErrors)) fieldErrors = data.error.fieldErrors;
    } catch {
      // Ignore JSON parse error
    }

    throw new TradingAccountClientApiError(errorMsg, response.status, errorCode, fieldErrors);
  }
}
