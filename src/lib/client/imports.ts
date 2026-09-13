/**
 * Import Domain — Client API
 *
 * Client-side integration for the unified import infrastructure.
 */

import { ImportPreview, NormalizedTradeCandidate } from "../trading/import/types";
import { ColumnMapping } from "../trading/import/mapping";
import { ConfirmImportResult } from "../trading/import/service";

export interface PreviewImportOptions {
  tradingAccountId: string;
  mapping?: ColumnMapping;
  sheetName?: string;
  delimiter?: string;
  timezone?: string;
}

export async function createImportPreview(
  file: File,
  options: PreviewImportOptions,
  abortSignal?: AbortSignal
): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tradingAccountId", options.tradingAccountId);
  if (options.mapping) {
    formData.append("mapping", JSON.stringify(options.mapping));
  }
  if (options.sheetName) {
    formData.append("sheetName", options.sheetName);
  }
  if (options.delimiter) {
    formData.append("delimiter", options.delimiter);
  }
  if (options.timezone) {
    formData.append("timezone", options.timezone);
  }

  const response = await fetch("/api/imports/preview", {
    method: "POST",
    body: formData,
    signal: abortSignal,
  });

  if (!response.ok) {
    let errorMessage = "Failed to create import preview";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function confirmImport(
  candidates: NormalizedTradeCandidate[],
  abortSignal?: AbortSignal
): Promise<ConfirmImportResult> {
  const response = await fetch("/api/imports/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ candidates }),
    signal: abortSignal,
  });

  if (!response.ok) {
    let errorMessage = "Failed to confirm import";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
