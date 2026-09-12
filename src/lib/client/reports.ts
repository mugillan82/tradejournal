/**
 * Reports Domain — Client Data Layer
 *
 * Centralized typed client module for requesting Advanced Trading Reports.
 * Handles query serialization, AbortController cancellation, and safe error parsing.
 */

import { buildAnalyticsQueryString } from "./analytics";
import type {
  ReportOverviewDto,
  ReportFilterInput,
  SymbolReportItemDto,
  StrategyReportItemDto,
  SetupReportItemDto,
  TagReportItemDto,
  MistakeReportItemDto,
  AccountReportItemDto,
  DirectionReportDto,
  TimeReportDto,
} from "../trading/reports/types";

export type {
  ReportOverviewDto,
  ReportFilterInput,
  SymbolReportItemDto,
  StrategyReportItemDto,
  SetupReportItemDto,
  TagReportItemDto,
  MistakeReportItemDto,
  AccountReportItemDto,
  DirectionReportDto,
  TimeReportDto,
};

export class ReportClientApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string = "INTERNAL_ERROR") {
    super(message);
    this.name = "ReportClientApiError";
    this.status = status;
    this.code = code;
  }
}

export function buildReportQueryString(filters: ReportFilterInput = {}): string {
  return buildAnalyticsQueryString(filters);
}

/**
 * Fetch report overview from the server API.
 */
export async function fetchReportOverview(
  filters: ReportFilterInput = {},
  signal?: AbortSignal,
): Promise<ReportOverviewDto> {
  const qs = buildReportQueryString(filters);
  const url = qs ? `/api/reports/overview?${qs}` : "/api/reports/overview";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    let errorMsg = `Failed to fetch reports (status ${response.status})`;
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
      // Ignore JSON parsing failures on non-200
    }
    throw new ReportClientApiError(errorMsg, response.status, errorCode);
  }

  return response.json();
}
