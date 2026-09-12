/**
 * Data Management & Export — Client Data Layer
 *
 * Centralized typed client module for overview counts and export downloads.
 * Handles query serialization, AbortController cancellation, structured errors,
 * and browser-friendly download triggering.
 */

import type {
  DataManagementOverviewDto,
  ExportFilterInput,
  ExportDataset,
  ExportFormat,
} from "../trading/data-management/types";

export type {
  DataManagementOverviewDto,
  ExportFilterInput,
  ExportDataset,
  ExportFormat,
};

export class DataManagementClientApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, status: number, code: string = "DATA_MANAGEMENT_ERROR", details?: Record<string, unknown>) {
    super(message);
    this.name = "DataManagementClientApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Builds safe URL query string from export filters.
 */
export function buildExportQueryString(filters: ExportFilterInput): string {
  const params = new URLSearchParams();

  if (filters.dataset) params.set("dataset", filters.dataset);
  if (filters.format) params.set("format", filters.format);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  return params.toString();
}

/**
 * Fetches user-scoped overview counts from the server API.
 */
export async function fetchDataManagementOverview(
  signal?: AbortSignal
): Promise<DataManagementOverviewDto> {
  const url = "/api/data-management/overview";
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  });

  if (!res.ok) {
    let errorData: { error?: { message?: string; code?: string; details?: Record<string, unknown> } } = {};
    try {
      errorData = await res.json();
    } catch {
      // json parse failed
    }

    throw new DataManagementClientApiError(
      errorData.error?.message ?? "Failed to fetch data overview",
      res.status,
      errorData.error?.code ?? "OVERVIEW_FETCH_FAILED",
      errorData.error?.details
    );
  }

  const json = await res.json();
  return json.data as DataManagementOverviewDto;
}

export interface ExportDownloadResult {
  filename: string;
  recordCount: number;
  data: string;
  mimeType: string;
}

/**
 * Requests an export payload from the server API.
 */
export async function requestExportDownload(
  filters: ExportFilterInput,
  signal?: AbortSignal
): Promise<ExportDownloadResult> {
  const qs = buildExportQueryString(filters);
  const url = `/api/data-management/export?${qs}`;

  const res = await fetch(url, {
    method: "GET",
    signal,
  });

  if (!res.ok) {
    let errorData: { error?: { message?: string; code?: string; details?: Record<string, unknown> } } = {};
    try {
      errorData = await res.json();
    } catch {
      // json parse failed
    }

    throw new DataManagementClientApiError(
      errorData.error?.message ?? "Export failed",
      res.status,
      errorData.error?.code ?? "EXPORT_FAILED",
      errorData.error?.details
    );
  }

  // Parse filename from Content-Disposition header if available
  const contentDisposition = res.headers.get("Content-Disposition");
  let filename = `tradejournal-${filters.dataset}.${filters.format ?? (filters.dataset === "full" ? "json" : "csv")}`;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  const recordCountHeader = res.headers.get("X-Export-Records");
  const recordCount = recordCountHeader ? parseInt(recordCountHeader, 10) : 0;
  const mimeType = res.headers.get("Content-Type") ?? (filters.format === "json" ? "application/json" : "text/csv");
  const data = await res.text();

  return {
    filename,
    recordCount,
    data,
    mimeType,
  };
}

/**
 * Triggers a file download in the browser.
 */
export function triggerBrowserDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
