/**
 * Client Data Layer — Analytics
 *
 * Centralized data access layer for browser components consuming the
 * backend Analytics & Performance API (`/api/analytics/overview`).
 *
 * Enforces typed parameter serialization, safe error parsing, and
 * prevents Prisma/database internal leaks.
 */

import type {
  AnalyticsFilterInput,
  AnalyticsOverviewDto,
  CorePerformanceMetricsDto,
  PerformanceByAccountItemDto,
  PerformanceByDateItemDto,
  PerformanceByMistakeItemDto,
  PerformanceBySetupItemDto,
  PerformanceByStrategyItemDto,
  PerformanceBySymbolItemDto,
  PerformanceByTagItemDto,
  EquityCurvePointDto,
} from "@/lib/trading/analytics/types";

export type {
  AnalyticsFilterInput,
  AnalyticsOverviewDto,
  CorePerformanceMetricsDto,
  PerformanceByAccountItemDto,
  PerformanceByDateItemDto,
  PerformanceByMistakeItemDto,
  PerformanceBySetupItemDto,
  PerformanceByStrategyItemDto,
  PerformanceBySymbolItemDto,
  PerformanceByTagItemDto,
  EquityCurvePointDto,
};

export class AnalyticsClientApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: ReadonlyArray<{ path: string; message: string }>;

  constructor(
    message: string,
    status = 500,
    code = "API_ERROR",
    fieldErrors?: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "AnalyticsClientApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Builds the URLSearchParams query string for `GET /api/analytics/overview`.
 */
export function buildAnalyticsQueryString(filter: AnalyticsFilterInput = {}): string {
  const params = new URLSearchParams();

  if (filter.dateFrom) {
    const fromStr =
      filter.dateFrom instanceof Date
        ? filter.dateFrom.toISOString()
        : String(filter.dateFrom);
    params.set("dateFrom", fromStr);
  }

  if (filter.dateTo) {
    const toStr =
      filter.dateTo instanceof Date
        ? filter.dateTo.toISOString()
        : String(filter.dateTo);
    params.set("dateTo", toStr);
  }

  if (filter.tradingAccountId && filter.tradingAccountId.trim() !== "") {
    params.set("tradingAccountId", filter.tradingAccountId.trim());
  }

  if (filter.symbol && filter.symbol.trim() !== "") {
    params.set("symbol", filter.symbol.trim());
  }

  if (filter.side) {
    params.set("side", filter.side);
  }

  if (filter.status) {
    params.set("status", filter.status);
  }

  if (filter.strategyId && filter.strategyId.trim() !== "") {
    params.set("strategyId", filter.strategyId.trim());
  }

  if (filter.setupId && filter.setupId.trim() !== "") {
    params.set("setupId", filter.setupId.trim());
  }

  if (filter.tagId && filter.tagId.trim() !== "") {
    params.set("tagId", filter.tagId.trim());
  }

  if (filter.mistakeId && filter.mistakeId.trim() !== "") {
    params.set("mistakeId", filter.mistakeId.trim());
  }

  return params.toString();
}

/**
 * Fetches the analytics overview for the authenticated user.
 */
export async function fetchAnalyticsOverview(
  filter: AnalyticsFilterInput = {},
  signal?: AbortSignal,
): Promise<AnalyticsOverviewDto> {
  const queryString = buildAnalyticsQueryString(filter);
  const url = `/api/analytics/overview${queryString ? `?${queryString}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "GET",
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
          fieldErrors?: Array<{ path: string; message: string }>;
        };
      } = {};

      try {
        errBody = await res.json();
      } catch {
        // Non-JSON response
      }

      const message =
        errBody?.error?.message || `Failed to fetch analytics (${res.status})`;
      const code = errBody?.error?.code || "API_ERROR";
      const fieldErrors = errBody?.error?.fieldErrors;

      throw new AnalyticsClientApiError(message, res.status, code, fieldErrors);
    }

    const data: AnalyticsOverviewDto = await res.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof AnalyticsClientApiError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    const msg =
      err instanceof Error
        ? err.message
        : "Network error occurred while fetching analytics";
    throw new AnalyticsClientApiError(msg, 500, "NETWORK_ERROR");
  }
}

/**
 * Dropdown filter metadata helpers.
 */
export interface FilterOptionItem {
  readonly id: string;
  readonly name: string;
  readonly color?: string | null;
  readonly currency?: string;
}

export async function fetchFilterOptions(signal?: AbortSignal): Promise<{
  accounts: FilterOptionItem[];
  strategies: FilterOptionItem[];
  setups: FilterOptionItem[];
  tags: FilterOptionItem[];
  mistakes: FilterOptionItem[];
}> {
  try {
    const [accRes, stratRes, setupRes, tagRes, mistakeRes] = await Promise.allSettled([
      fetch("/api/trading-accounts", { signal }).then((r) => (r.ok ? r.json() : { items: [] })),
      fetch("/api/strategies", { signal }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/setups", { signal }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/tags", { signal }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/mistakes", { signal }).then((r) => (r.ok ? r.json() : [])),
    ]);

    const accounts: FilterOptionItem[] =
      accRes.status === "fulfilled" && accRes.value?.items
        ? accRes.value.items.map((a: { id: string; name: string; currency?: string }) => ({
            id: a.id,
            name: a.name,
            currency: a.currency,
          }))
        : [];

    const strategies: FilterOptionItem[] =
      stratRes.status === "fulfilled" && Array.isArray(stratRes.value)
        ? stratRes.value.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))
        : [];

    const setups: FilterOptionItem[] =
      setupRes.status === "fulfilled" && Array.isArray(setupRes.value)
        ? setupRes.value.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))
        : [];

    const tags: FilterOptionItem[] =
      tagRes.status === "fulfilled" && Array.isArray(tagRes.value)
        ? tagRes.value.map((t: { id: string; name: string; color?: string | null }) => ({
            id: t.id,
            name: t.name,
            color: t.color,
          }))
        : [];

    const mistakes: FilterOptionItem[] =
      mistakeRes.status === "fulfilled" && Array.isArray(mistakeRes.value)
        ? mistakeRes.value.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }))
        : [];

    return { accounts, strategies, setups, tags, mistakes };
  } catch {
    return { accounts: [], strategies: [], setups: [], tags: [], mistakes: [] };
  }
}
