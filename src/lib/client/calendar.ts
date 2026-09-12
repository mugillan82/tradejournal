/**
 * Calendar Domain — Client Data Layer
 *
 * Typed client API functions for querying monthly calendar performance and daily trades.
 * Handles query string serialization, AbortController cancellation, and structured error mapping.
 */

import type {
  MonthCalendarDto,
  CalendarDayDto,
  CalendarMonthSummaryDto,
  CalendarTradeItemDto,
  CalendarFilterInput,
} from "../trading/calendar/types";

export type {
  MonthCalendarDto,
  CalendarDayDto,
  CalendarMonthSummaryDto,
  CalendarTradeItemDto,
  CalendarFilterInput,
};

export class CalendarClientApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string = "INTERNAL_ERROR") {
    super(message);
    this.name = "CalendarClientApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Build URL search query string for month calendar requests.
 */
export function buildCalendarQueryString(
  month: string,
  filters: CalendarFilterInput = {},
): string {
  const params = new URLSearchParams();

  if (month) {
    params.set("month", month);
  }

  if (filters.tradingAccountId) {
    params.set("tradingAccountId", filters.tradingAccountId);
  }
  if (filters.symbol && filters.symbol.trim().length > 0) {
    params.set("symbol", filters.symbol.trim());
  }
  if (filters.side) {
    params.set("side", filters.side);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.strategyId) {
    params.set("strategyId", filters.strategyId);
  }
  if (filters.setupId) {
    params.set("setupId", filters.setupId);
  }
  if (filters.tagId) {
    params.set("tagId", filters.tagId);
  }
  if (filters.mistakeId) {
    params.set("mistakeId", filters.mistakeId);
  }

  return params.toString();
}

/**
 * Fetch monthly calendar performance data from the server.
 */
export async function fetchMonthCalendar(
  month: string,
  filters: CalendarFilterInput = {},
  signal?: AbortSignal,
): Promise<MonthCalendarDto> {
  const qs = buildCalendarQueryString(month, filters);
  const url = `/api/calendar/month?${qs}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    let errorMsg = `Failed to fetch calendar (status ${response.status})`;
    let errorCode = "FETCH_ERROR";
    try {
      const data = await response.json();
      if (data?.error?.message) {
        errorMsg = data.error.message;
      }
      if (data?.error?.code) {
        errorCode = data.error.code;
      }
    } catch {
      // Ignore JSON parse errors on non-200
    }
    throw new CalendarClientApiError(errorMsg, response.status, errorCode);
  }

  return response.json();
}
