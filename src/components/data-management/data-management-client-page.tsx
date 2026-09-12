"use client";

import React, { useState, useEffect, useCallback } from "react";
import type {
  DataManagementOverviewDto,
  ExportDataset,
  ExportFormat,
} from "@/lib/client/data-management";
import {
  fetchDataManagementOverview,
  requestExportDownload,
  triggerBrowserDownload,
} from "@/lib/client/data-management";
import { DataManagementHeader } from "./data-management-header";
import { DataOverviewGrid } from "./data-overview-grid";
import { ExportCardsSection } from "./export-cards-section";
import { DataIntegrityCard } from "./data-integrity-card";
import { FutureImportCard } from "./future-import-card";
import { DataManagementSkeleton } from "./data-management-skeleton";
import { AlertCircle, CheckCircle, RotateCcw } from "@/components/icons";

export function DataManagementClientPage() {
  const [overview, setOverview] = useState<DataManagementOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Export progress
  const [isExporting, setIsExporting] = useState(false);
  const [activeDataset, setActiveDataset] = useState<ExportDataset | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 5000);
  };

  const loadOverview = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchDataManagementOverview(signal);
      setOverview(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load data overview counts."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function init() {
      await loadOverview(controller.signal);
    }

    init();

    return () => {
      controller.abort();
    };
  }, [loadOverview]);

  const handleExport = async (dataset: ExportDataset, format: ExportFormat) => {
    if (isExporting) return;

    setIsExporting(true);
    setActiveDataset(dataset);
    setExportError(null);

    try {
      const result = await requestExportDownload({ dataset, format });
      triggerBrowserDownload(result.data, result.filename, result.mimeType);
      showToast(
        `Successfully generated and downloaded ${result.filename} (${result.recordCount} records)`
      );
    } catch (err: unknown) {
      setExportError(
        err instanceof Error ? err.message : `Failed to export ${dataset}. Please try again.`
      );
    } finally {
      setIsExporting(false);
      setActiveDataset(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <DataManagementHeader />

      {/* Success Toast */}
      {successToast && (
        <div
          role="status"
          data-testid="data-management-success-toast"
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between text-sm animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3 font-medium">
            <CheckCircle size={18} className="text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-xs text-emerald-400/70 hover:text-emerald-300 font-mono underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Export Error Alert */}
      {exportError && (
        <div
          role="alert"
          data-testid="data-management-export-error"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between text-sm animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3 font-medium">
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
            <span>{exportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-xs text-rose-400/70 hover:text-rose-300 font-mono underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Overview Error */}
      {errorMessage && (
        <div
          role="alert"
          data-testid="data-management-load-error"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between text-sm"
        >
          <div className="flex items-center gap-3 font-medium">
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              loadOverview();
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-medium transition-all"
          >
            <RotateCcw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {isLoading ? (
        <DataManagementSkeleton />
      ) : (
        <>
          {/* Overview Counts */}
          <DataOverviewGrid overview={overview} isLoading={isLoading} />

          {/* Export Center Cards */}
          <ExportCardsSection
            onExport={handleExport}
            isExporting={isExporting}
            activeDataset={activeDataset}
          />

          {/* Data Integrity Guarantees */}
          <DataIntegrityCard />

          {/* Future Import Reserved Area */}
          <FutureImportCard />
        </>
      )}
    </div>
  );
}
