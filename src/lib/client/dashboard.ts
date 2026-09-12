/**
 * Dashboard Domain — Client API
 *
 * Client-side utilities for fetching consolidated dashboard metrics.
 * Provides query string serialization, typed response mapping, AbortSignal support,
 * and robust error encapsulation.
 */

import type {
  DashboardOverviewDto,
  DashboardFilterInput,
  DashboardTodaySummaryDto,
  DashboardMonthSummaryDto,
  DashboardDirectionSummaryDto,
} from "../trading/dashboard/types";
import type { TradeDto } from "../trading/trade/types";
import type { TradingAccountDto } from "../trading/account/types";
import type { JournalEntryDto } from "../trading/journal/types";
import type { MonthCalendarDto } from "../trading/calendar/types";
import type {
  CorePerformanceMetricsDto,
  EquityCurvePointDto,
  PerformanceBySymbolItemDto,
  PerformanceByStrategyItemDto,
} from "../trading/analytics/types";

export type {
  DashboardOverviewDto,
  DashboardFilterInput,
  DashboardTodaySummaryDto,
  DashboardMonthSummaryDto,
  DashboardDirectionSummaryDto,
  TradeDto,
  TradingAccountDto,
  JournalEntryDto,
  MonthCalendarDto,
  CorePerformanceMetricsDto,
  EquityCurvePointDto,
  PerformanceBySymbolItemDto,
  PerformanceByStrategyItemDto,
};

export class DashboardClientApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "DashboardClientApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Serializes DashboardFilterInput into URL query parameters.
 */
export function buildDashboardQueryString(filters?: DashboardFilterInput): string {
  if (!filters) return "";
  const params = new URLSearchParams();

  if (filters.tradingAccountId) {
    params.set("tradingAccountId", filters.tradingAccountId);
  }
  if (filters.dateFrom) {
    params.set(
      "dateFrom",
      filters.dateFrom instanceof Date
        ? filters.dateFrom.toISOString()
        : String(filters.dateFrom),
    );
  }
  if (filters.dateTo) {
    params.set(
      "dateTo",
      filters.dateTo instanceof Date
        ? filters.dateTo.toISOString()
        : String(filters.dateTo),
    );
  }

  return params.toString();
}

/**
 * Fetch consolidated dashboard overview from GET /api/dashboard/overview.
 */
export async function fetchDashboardOverview(
  filters?: DashboardFilterInput,
  signal?: AbortSignal,
): Promise<DashboardOverviewDto> {
  const qs = buildDashboardQueryString(filters);
  const url = qs ? `/api/dashboard/overview?${qs}` : "/api/dashboard/overview";

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!res.ok) {
    let errorMsg = `Failed to fetch dashboard: HTTP ${res.status}`;
    let errorCode: string | undefined;

    try {
      const body = await res.json();
      if (body?.error) {
        errorMsg = body.error;
      }
      if (body?.type) {
        errorCode = body.type;
      }
    } catch {
      // Body is not JSON
    }

    throw new DashboardClientApiError(errorMsg, res.status, errorCode);
  }

  return res.json();
}
