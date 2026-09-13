"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  Check,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { fetchTradingAccountsClient } from "@/lib/client/accounts";
import type { TradingAccountDto } from "@/lib/trading/account/types";
import { createImportPreview, confirmImport } from "@/lib/client/imports";
import {
  CANONICAL_FIELDS_META,
  REQUIRED_CANONICAL_FIELDS,
  CanonicalField,
  ColumnMapping,
  suggestCanonicalMapping,
} from "@/lib/trading/import/mapping";
import type { ImportPreview, NormalizedTradeCandidate } from "@/lib/trading/import/types";
import type { ConfirmImportResult } from "@/lib/trading/import/service";

type ImportStep = "UPLOAD" | "MAPPING" | "PREVIEW" | "CONFIRM" | "RESULTS";

const PAGE_SIZE = 15;

export function StructuredImportClientPage() {
  // Accounts
  const [accounts, setAccounts] = useState<TradingAccountDto[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [accountsLoading, setAccountsLoading] = useState<boolean>(true);

  // Workflow State
  const [step, setStep] = useState<ImportStep>("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [timezone, setTimezone] = useState<string>("UTC");
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  // Loading & Error States
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string>("");

  // Preview & Mapping Data
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [inspectedCandidate, setInspectedCandidate] = useState<NormalizedTradeCandidate | null>(null);

  // Filter & Pagination for Preview Table
  const [filterTab, setFilterTab] = useState<"ALL" | "VALID" | "ISSUES" | "DUPLICATES">("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Result State
  const [importResult, setImportResult] = useState<ConfirmImportResult | null>(null);

  // Fetch trading accounts on mount
  useEffect(() => {
    fetchTradingAccountsClient()
      .then((res) => {
        const items = res.items || [];
        setAccounts([...items]);
        if (items.length > 0) {
          setSelectedAccountId(items[0].id);
        }
      })
      .catch(() => {
        setGeneralError("Failed to load trading accounts.");
      })
      .finally(() => {
        setAccountsLoading(false);
      });
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setGeneralError("");
    const ext = selectedFile.name.toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx")) {
      setGeneralError("Only .csv and .xlsx files are supported.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setGeneralError("File size exceeds 10MB limit.");
      return;
    }
    setFile(selectedFile);
    setPreview(null);
    setColumnMapping({});
    setImportResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Step 1 -> 2/3: Parse file & build initial preview
  const handleProceedToMapping = async (sheetOverride?: string) => {
    if (!file) {
      setGeneralError("Please select a file to import.");
      return;
    }
    if (!selectedAccountId) {
      setGeneralError("Please choose a trading account.");
      return;
    }

    setIsLoadingPreview(true);
    setGeneralError("");

    try {
      const prev = await createImportPreview(file, {
        tradingAccountId: selectedAccountId,
        mapping: Object.keys(columnMapping).length > 0 ? columnMapping : undefined,
        sheetName: sheetOverride || selectedSheet || undefined,
        timezone: timezone || undefined,
      });

      setPreview(prev);
      if (prev.selectedSheet) {
        setSelectedSheet(prev.selectedSheet);
      }

      // Initialize mapping from preview response if not already set
      if (Object.keys(columnMapping).length === 0 && prev.headers) {
        const initialMapping: ColumnMapping = {};
        for (const h of prev.headers) {
          if (prev.unmappedColumns?.includes(h)) {
            initialMapping[h] = null;
          } else {
            initialMapping[h] = suggestCanonicalMapping(h);
          }
        }
        setColumnMapping(initialMapping);
      }

      setStep("MAPPING");
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Failed to parse import file.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Switch Sheet (for Excel workbooks)
  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    handleProceedToMapping(newSheet);
  };

  // Column mapping change handler
  const handleMappingChange = (sourceColumn: string, canonicalField: CanonicalField | "") => {
    setColumnMapping((prev) => ({
      ...prev,
      [sourceColumn]: canonicalField === "" ? null : canonicalField,
    }));
  };

  // Apply Mapping -> Preview Step
  const handleApplyMappingAndPreview = async () => {
    if (!file || !selectedAccountId) return;
    setIsLoadingPreview(true);
    setGeneralError("");

    try {
      const prev = await createImportPreview(file, {
        tradingAccountId: selectedAccountId,
        mapping: columnMapping,
        sheetName: selectedSheet || undefined,
        timezone: timezone || undefined,
      });

      setPreview(prev);
      setStep("PREVIEW");
      setCurrentPage(1);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Failed to update import preview.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Check missing required fields
  const missingRequired = useMemo(() => {
    const mappedFields = new Set(Object.values(columnMapping).filter(Boolean));
    return REQUIRED_CANONICAL_FIELDS.filter((req) => !mappedFields.has(req));
  }, [columnMapping]);

  // Filtered Candidates for Preview Table
  const filteredCandidates = useMemo(() => {
    if (!preview?.candidates) return [];
    if (filterTab === "VALID") {
      return preview.candidates.filter((c) => c.isValid && c.duplicateMatch.classification === "NONE");
    }
    if (filterTab === "ISSUES") {
      return preview.candidates.filter(
        (c) => !c.isValid || c.validationIssues.some((i) => i.level === "WARNING")
      );
    }
    if (filterTab === "DUPLICATES") {
      return preview.candidates.filter((c) => c.duplicateMatch.classification !== "NONE");
    }
    return preview.candidates;
  }, [preview, filterTab]);

  const totalPages = Math.ceil(filteredCandidates.length / PAGE_SIZE) || 1;
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCandidates.slice(start, start + PAGE_SIZE);
  }, [filteredCandidates, currentPage]);

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!preview?.candidates || preview.candidates.length === 0) return;

    // Filter out invalid records and exact duplicates
    const candidatesToImport = preview.candidates.filter(
      (c) => c.isValid && c.duplicateMatch.classification !== "EXACT"
    );

    if (candidatesToImport.length === 0) {
      setGeneralError("No valid trades available to import. Please check validation issues.");
      return;
    }

    setIsConfirming(true);
    setGeneralError("");

    try {
      const result = await confirmImport(candidatesToImport);
      setImportResult(result);
      setStep("RESULTS");
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Failed to confirm trade import.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setColumnMapping({});
    setImportResult(null);
    setInspectedCandidate(null);
    setGeneralError("");
    setStep("UPLOAD");
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Workflow Navigation Stepper */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/60 text-xs">
        <div className="flex items-center gap-2">
          <Link href="/import" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1">
            Import Hub
          </Link>
          <span className="text-slate-600">/</span>
          <span className="font-semibold text-white">Structured Import</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
          <span
            className={`px-2.5 py-1 rounded-full font-medium ${
              step === "UPLOAD"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400"
            }`}
          >
            1. Upload & Account
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
          <span
            className={`px-2.5 py-1 rounded-full font-medium ${
              step === "MAPPING"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400"
            }`}
          >
            2. Column Mapping
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
          <span
            className={`px-2.5 py-1 rounded-full font-medium ${
              step === "PREVIEW" || step === "CONFIRM"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400"
            }`}
          >
            3. Preview & Validate
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
          <span
            className={`px-2.5 py-1 rounded-full font-medium ${
              step === "RESULTS"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400"
            }`}
          >
            4. Results
          </span>
        </div>
      </div>

      {generalError && (
        <Alert variant="error" className="shadow-lg">
          {generalError}
        </Alert>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: UPLOAD & ACCOUNT SELECTION                                        */}
      {/* ========================================================================= */}
      {step === "UPLOAD" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/40 p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Upload Structured File</h2>
              <p className="text-slate-400 text-sm mt-1">
                Select a CSV or Excel workbook (.xlsx) to import trades into your trading journal.
              </p>
            </div>

            {/* Account & Timezone Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Target Trading Account <span className="text-emerald-400">*</span>
                </label>
                {accountsLoading ? (
                  <div className="h-10 rounded-lg bg-slate-800/50 animate-pulse" />
                ) : accounts.length === 0 ? (
                  <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 p-3 rounded-lg">
                    No trading account found. Please create an account in Trading Accounts first.
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  Source Timezone <Clock className="w-3.5 h-3.5 text-slate-500" />
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="UTC">UTC (Universal Time Coordinated)</option>
                  <option value="America/New_York">America/New York (EST/EDT)</option>
                  <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Applied to timestamps that do not explicitly specify a timezone offset.
                </p>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all duration-200 cursor-pointer ${
                isDragOver
                  ? "border-emerald-500 bg-emerald-950/20"
                  : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50"
              }`}
            >
              <input
                type="file"
                accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload-input"
              />

              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {file ? file.name : "Drag & drop your trade file here, or click to browse"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports .csv (UTF-8) and .xlsx (Excel) up to 10MB
                  </p>
                </div>

                {file && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{file.name}</span>
                    <span className="text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/60">
              <Button
                variant="primary"
                size="lg"
                disabled={!file || !selectedAccountId || isLoadingPreview}
                loading={isLoadingPreview}
                onClick={() => handleProceedToMapping()}
              >
                <span>Parse & Map Columns</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2 & 3: SHEET SELECTION (FOR XLSX) & COLUMN MAPPING                  */}
      {/* ========================================================================= */}
      {step === "MAPPING" && preview && (
        <div className="space-y-6">
          {/* Sheet Selector if multiple sheets exist */}
          {preview.availableSheets && preview.availableSheets.length > 1 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-300">Workbook Worksheets:</span>
                  <p className="text-[11px] text-slate-400">Select the sheet containing trade executions.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  disabled={isLoadingPreview}
                  className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-emerald-500"
                >
                  {preview.availableSheets.map((s) => (
                    <option key={s} value={s}>
                      {s} {s === preview.selectedSheet ? "(Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Missing Required Warning */}
          {missingRequired.length > 0 && (
            <Alert variant="warning" className="text-xs">
              <div className="space-y-1">
                <p className="font-semibold">Missing required column mappings:</p>
                <p>
                  Please map columns for:{" "}
                  <span className="font-mono font-bold">{missingRequired.join(", ")}</span> before
                  proceeding.
                </p>
              </div>
            </Alert>
          )}

          {/* Mapping Table */}
          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/40 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Column Mapping</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Match the detected file columns to TradeJournal canonical fields.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleProceedToMapping()}
                  disabled={isLoadingPreview}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Auto-Map
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold">
                    <th className="py-3 px-4">Source Header</th>
                    <th className="py-3 px-4">Sample Values</th>
                    <th className="py-3 px-4">Mapped Domain Field</th>
                    <th className="py-3 px-4">Requirement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {preview.headers?.map((header) => {
                    const currentMapped = columnMapping[header] || "";
                    const targetMeta = CANONICAL_FIELDS_META.find((m) => m.field === currentMapped);
                    const isRequired = targetMeta?.required;

                    // Sample values from first candidates
                    const samples = preview.candidates
                      .slice(0, 3)
                      .map((c) => {
                        const raw = (c as unknown as { rawRecord?: Record<string, string> }).rawRecord;
                        return raw ? raw[header] : undefined;
                      })
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <tr key={header} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-white">{header}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono truncate max-w-xs">
                          {samples || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={currentMapped}
                            onChange={(e) =>
                              handleMappingChange(header, e.target.value as CanonicalField | "")
                            }
                            className={`rounded-lg border px-3 py-1.5 text-xs text-white bg-slate-950 focus:outline-none focus:ring-1 ${
                              isRequired
                                ? "border-emerald-500/50 focus:ring-emerald-500"
                                : currentMapped
                                ? "border-slate-700 focus:ring-slate-500"
                                : "border-slate-800 text-slate-500"
                            }`}
                          >
                            <option value="">(Ignored / Unmapped)</option>
                            <optgroup label="Required Fields">
                              {CANONICAL_FIELDS_META.filter((m) => m.required).map((m) => (
                                <option key={m.field} value={m.field}>
                                  {m.label} *
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Optional Fields">
                              {CANONICAL_FIELDS_META.filter((m) => !m.required).map((m) => (
                                <option key={m.field} value={m.field}>
                                  {m.label}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          {isRequired ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              REQUIRED
                            </span>
                          ) : currentMapped ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              OPTIONAL
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-slate-500 border border-slate-800">
                              IGNORED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Stepper controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
              <Button variant="secondary" size="md" onClick={() => setStep("UPLOAD")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Upload
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={missingRequired.length > 0 || isLoadingPreview}
                loading={isLoadingPreview}
                onClick={handleApplyMappingAndPreview}
              >
                <span>Generate Preview</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4 & 5: PREVIEW & VALIDATION                                         */}
      {/* ========================================================================= */}
      {step === "PREVIEW" && preview && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <span className="text-xs text-slate-400 font-medium">Total Rows</span>
              <div className="text-2xl font-bold text-white mt-1">{preview.totalRecords}</div>
            </div>

            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
              <span className="text-xs text-emerald-400 font-medium">Valid Records</span>
              <div className="text-2xl font-bold text-emerald-300 mt-1">{preview.validRecords}</div>
            </div>

            <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
              <span className="text-xs text-amber-400 font-medium">Duplicates Detected</span>
              <div className="text-2xl font-bold text-amber-300 mt-1">
                {preview.duplicateRecords + preview.possibleDuplicates}
              </div>
            </div>

            <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4">
              <span className="text-xs text-rose-400 font-medium">Validation Issues</span>
              <div className="text-2xl font-bold text-rose-300 mt-1">{preview.invalidRecords}</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFilterTab("ALL");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterTab === "ALL"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All Records ({preview.candidates.length})
              </button>
              <button
                onClick={() => {
                  setFilterTab("VALID");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterTab === "VALID"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Valid Only
              </button>
              <button
                onClick={() => {
                  setFilterTab("ISSUES");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterTab === "ISSUES"
                    ? "bg-rose-950 text-rose-400 border border-rose-800/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Issues ({preview.invalidRecords})
              </button>
              <button
                onClick={() => {
                  setFilterTab("DUPLICATES");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterTab === "DUPLICATES"
                    ? "bg-amber-950 text-amber-400 border border-amber-800/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Duplicates ({preview.duplicateRecords + preview.possibleDuplicates})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setStep("MAPPING")}>
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Adjust Mappings
              </Button>
            </div>
          </div>

          {/* Candidates Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Entry Price</th>
                  <th className="py-3 px-4">Exit Price</th>
                  <th className="py-3 px-4">Entry Date</th>
                  <th className="py-3 px-4">Net P&L</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duplicate</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-500">
                      No candidate records found for this filter tab.
                    </td>
                  </tr>
                ) : (
                  paginatedCandidates.map((cand) => (
                    <tr key={cand.candidateId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {cand.title || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cand.side === "LONG"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : cand.side === "SHORT"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "text-slate-500"
                          }`}
                        >
                          {cand.side || "UNKNOWN"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200">{cand.quantity || "—"}</td>
                      <td className="py-3 px-4 font-mono text-slate-200">{cand.entryPrice || "—"}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{cand.exitPrice || "—"}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {cand.entryDate ? new Date(cand.entryDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {cand.netPnl ? (
                          <span
                            className={
                              Number(cand.netPnl) >= 0 ? "text-emerald-400" : "text-rose-400"
                            }
                          >
                            {cand.netPnl}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            cand.status === "CLOSED"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {cand.status || "OPEN"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {cand.duplicateMatch.classification === "EXACT" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            EXACT DUP
                          </span>
                        ) : cand.duplicateMatch.classification === "POSSIBLE" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            POSSIBLE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                            NEW
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setInspectedCandidate(cand)}
                          className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-2">
              <span>
                Page {currentPage} of {totalPages} ({filteredCandidates.length} total filtered records)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Bottom Confirmation Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-white">Ready for Authoritative Server Confirmation</h3>
              <p className="text-xs text-slate-400 mt-1">
                {preview.validRecords} valid trades will be submitted to the Trade Service. Exact duplicates
                will be automatically skipped.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="md" onClick={() => setStep("MAPPING")}>
                Back to Mapping
              </Button>
              <Button
                variant="primary"
                size="lg"
                disabled={preview.validRecords === 0 || isConfirming}
                loading={isConfirming}
                onClick={handleConfirmImport}
              >
                <Check className="w-4 h-4 mr-1" />
                <span>Confirm & Import ({preview.validRecords}) Trades</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: INSPECT CANDIDATE MODAL / DRAWER                                 */}
      {/* ========================================================================= */}
      {inspectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Trade Candidate Details</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{inspectedCandidate.candidateId}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setInspectedCandidate(null)}>
                ✕
              </Button>
            </div>

            {/* Validation Issues */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Validation Assessment
              </h4>
              {inspectedCandidate.validationIssues.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-900/40">
                  <CheckCircle2 className="w-4 h-4" /> Passed all schema and domain validation checks.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {inspectedCandidate.validationIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-2.5 rounded-lg border flex items-start gap-2 ${
                        issue.level === "ERROR"
                          ? "bg-rose-950/40 border-rose-800/40 text-rose-300"
                          : "bg-amber-950/40 border-amber-800/40 text-amber-300"
                      }`}
                    >
                      {issue.level === "ERROR" ? (
                        <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        {issue.field && <span className="font-mono font-bold">{issue.field}: </span>}
                        <span>{issue.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Duplicate Reasons */}
            {inspectedCandidate.duplicateMatch.classification !== "NONE" && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Duplicate Engine Match ({inspectedCandidate.duplicateMatch.classification})
                </h4>
                <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 p-3 rounded-lg space-y-1">
                  {inspectedCandidate.duplicateMatch.reasons.map((r, i) => (
                    <p key={i}>• {r}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Normalized Values */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Normalized Candidate Values
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500">Symbol: </span>
                  <span className="text-white">{inspectedCandidate.title || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Side: </span>
                  <span className="text-white">{inspectedCandidate.side || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Quantity: </span>
                  <span className="text-white">{inspectedCandidate.quantity || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Entry Price: </span>
                  <span className="text-white">{inspectedCandidate.entryPrice || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Exit Price: </span>
                  <span className="text-white">{inspectedCandidate.exitPrice || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Net P&L: </span>
                  <span className="text-white">{inspectedCandidate.netPnl || "—"}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setInspectedCandidate(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 7: RESULTS VIEW                                                     */}
      {/* ========================================================================= */}
      {step === "RESULTS" && importResult && (
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/40 p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Import Complete</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Trades have been verified and processed through the canonical Trade Service.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
              <span className="text-xs text-emerald-400 font-medium">Successfully Imported</span>
              <div className="text-3xl font-bold text-emerald-300 mt-1">
                {importResult.successful}
              </div>
            </div>

            <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
              <span className="text-xs text-amber-400 font-medium">Skipped Duplicates / Filtered</span>
              <div className="text-3xl font-bold text-amber-300 mt-1">
                {preview ? preview.duplicateRecords : 0}
              </div>
            </div>

            <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-4">
              <span className="text-xs text-rose-400 font-medium">Failed Records</span>
              <div className="text-3xl font-bold text-rose-300 mt-1">{importResult.failed}</div>
            </div>
          </div>

          {/* Failed Records Error List */}
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Error Details ({importResult.errors.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {importResult.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="text-xs bg-rose-950/30 border border-rose-900/40 p-2.5 rounded-lg text-rose-200"
                  >
                    <span className="font-mono font-bold text-rose-400">{err.candidateId}: </span>
                    {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post-Import Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800/80">
            <Link href="/trades">
              <Button variant="primary" size="md">
                <span>View Trades in Journal</span>
                <ExternalLink className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="secondary" size="md">
                <span>View Analytics</span>
              </Button>
            </Link>
            <Button variant="ghost" size="md" onClick={handleReset}>
              Import Another File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
