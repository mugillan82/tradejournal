"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { TradingAccountDto } from "@/lib/trading/account/types";
import { fetchTradingAccountsClient } from "@/lib/client/accounts";
import { SourceDetectionResult } from "@/lib/trading/smart-import/types";
import type { NormalizedTradeCandidate } from "@/lib/trading/import/types";
import type { ConfirmImportResult } from "@/lib/trading/import/service";
import { validateCandidate } from "@/lib/trading/import/validation";

interface ImportPreview {
  candidates: NormalizedTradeCandidate[];
  duplicateCount: number;
  errorCount: number;
  readyCount: number;
  nonTradeCount?: number;
  excludedRows?: { type: string; rawText: string }[];
}

export type ImportStatus = "IDLE" | "PROCESSING" | "SUCCESS" | "NEEDS_REVIEW" | "FAILED" | "TIMEOUT";

export function SmartImportClientPage() {
  const [file, setFile] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<TradingAccountDto[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [status, setStatus] = useState<ImportStatus>("IDLE");
  const [error, setError] = useState("");

  const [sourceDetection, setSourceDetection] = useState<SourceDetectionResult | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ConfirmImportResult | null>(null);

  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // Abort any pending upload request on component unmount
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
        activeControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetchTradingAccountsClient()
      .then((res) => {
        setAccounts([...(res.items || [])]);
        if (res.items && res.items.length > 0) setSelectedAccountId(res.items[0].id);
      })
      .catch(() => setError("Failed to load accounts."));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
      activeControllerRef.current = null;
    }
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setSourceDetection(null);
      setImportResult(null);
      setError("");
      setStatus("IDLE");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!selectedAccountId) {
      setError("Please select a trading account.");
      return;
    }

    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }

    setIsLoading(true);
    setStatus("PROCESSING");
    setError("");

    const formData = new FormData();
    formData.append("screenshot", file);
    formData.append("tradingAccountId", selectedAccountId);

    const controller = new AbortController();
    activeControllerRef.current = controller;
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, 58000); // 58-second client-side timeout to match server maxDuration budget

    try {
      const res = await fetch("/api/imports/smart/preview", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await res.json()) as {
        success?: boolean;
        status?: "SUCCESS" | "NEEDS_REVIEW";
        error?: string;
        message?: string;
        sourceDetection?: SourceDetectionResult;
        preview?: ImportPreview;
      };

      if (activeControllerRef.current !== controller) {
        return;
      }

      if (!res.ok) {
        const isTimeoutResponse = res.status === 408 || data.error === "TIMEOUT";
        const customErr = new Error(
          data.message ||
            data.error ||
            (isTimeoutResponse
              ? "Screenshot processing timed out. Please retry."
              : "Failed to process screenshot")
        );
        if (isTimeoutResponse) {
          (customErr as Error & { isTimeout?: boolean }).isTimeout = true;
        }
        throw customErr;
      }

      if (data.sourceDetection) setSourceDetection(data.sourceDetection);
      if (data.preview) {
        setPreview(data.preview);
        const resolvedStatus =
          data.status ||
          (data.preview.errorCount > 0 || data.preview.candidates.length === 0 ? "NEEDS_REVIEW" : "SUCCESS");
        setStatus(resolvedStatus);
      } else {
        setStatus("FAILED");
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (activeControllerRef.current !== controller) {
        return;
      }

      const isTimeout =
        didTimeout ||
        (err instanceof Error &&
          (err.name === "AbortError" ||
            err.message.includes("aborted") ||
            (err as { isTimeout?: boolean }).isTimeout === true));

      if (isTimeout) {
        setStatus("TIMEOUT");
        setError(
          didTimeout || (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted")))
            ? "Screenshot processing timed out. Please click 'Retry Extraction' or try a clearer image."
            : err instanceof Error
            ? err.message
            : "Screenshot processing timed out. Please retry."
        );
      } else {
        setStatus("FAILED");
        setError(err instanceof Error ? err.message : "Failed to upload screenshot");
      }
    } finally {
      clearTimeout(timeoutId);
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleConfirm = async () => {
    if (!preview || preview.candidates.length === 0) return;

    setIsConfirming(true);
    setError("");

    try {
      let res: Response;
      if (file) {
        // Send multipart form data preserving original screenshot as evidence
        const formData = new FormData();
        formData.append("candidates", JSON.stringify(preview.candidates));
        formData.append("evidence", file);
        res = await fetch("/api/imports/confirm", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/imports/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidates: preview.candidates }),
        });
      }

      const data = (await res.json()) as ConfirmImportResult & { error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message || "Failed to confirm import");

      setImportResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to confirm import");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCandidateChange = (
    index: number,
    field: keyof NormalizedTradeCandidate,
    val: string
  ) => {
    if (!preview) return;

    const updatedCandidates = [...preview.candidates];
    const candidate = { ...updatedCandidates[index] };

    if (field === "title") {
      candidate.title = val.toUpperCase().trim();
    } else if (field === "side") {
      candidate.side = val as "LONG" | "SHORT";
    } else if (field === "quantity") {
      candidate.quantity = val;
    } else if (field === "entryPrice") {
      candidate.entryPrice = val;
    } else if (field === "grossPnl") {
      candidate.grossPnl = val;
      candidate.netPnl = val;
    }

    if (!candidate.tradingAccountId) {
      candidate.tradingAccountId = selectedAccountId;
    }
    if (!candidate.entryDate) {
      candidate.entryDate = new Date();
    }
    if (candidate.exitDate && candidate.entryDate && candidate.exitDate < candidate.entryDate) {
      candidate.entryDate = new Date(candidate.exitDate.getTime() - 60000);
    }
    if (!candidate.quantity || Number(candidate.quantity) <= 0) {
      candidate.quantity = "0.01";
    }

    const validated = validateCandidate(candidate);
    candidate.validationIssues = validated.validationIssues;
    candidate.isValid = validated.isValid && Boolean(candidate.title?.trim() && candidate.entryPrice);

    updatedCandidates[index] = candidate;

    let validCount = 0;
    let invalidCount = 0;
    let exactDupCount = 0;
    let possibleDupCount = 0;

    for (const c of updatedCandidates) {
      if (c.isValid) validCount++;
      else invalidCount++;
      if (c.duplicateMatch?.classification === "EXACT") exactDupCount++;
      if (c.duplicateMatch?.classification === "POSSIBLE") possibleDupCount++;
    }

    setPreview({
      ...preview,
      candidates: updatedCandidates,
      readyCount: Math.max(0, validCount - exactDupCount),
      errorCount: invalidCount,
      duplicateCount: exactDupCount + possibleDupCount,
    });
  };

  return (
    <div className="space-y-6">
      {!preview && !importResult && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Trading Account</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Screenshot</label>
              <Input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
            </div>

            {error && (
              <div className="space-y-3">
                <Alert variant="error">
                  <AlertCircle className="h-4 w-4" />
                  <div className="font-semibold mb-1">
                    {status === "TIMEOUT" ? "Extraction Timed Out" : "Extraction Failed"}
                  </div>
                  <div className="text-sm">{error}</div>
                </Alert>
                <Button variant="secondary" onClick={handleUpload} className="w-full sm:w-auto">
                  Retry Extraction
                </Button>
              </div>
            )}

            <Button onClick={handleUpload} disabled={isLoading || !file} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting Trades...
                </>
              ) : (
                "Extract Trades"
              )}
            </Button>
          </div>
        </div>
      )}

      {sourceDetection && (
        <Alert variant={sourceDetection.confidence > 0.7 ? "info" : "warning"}>
          <CheckCircle2 className="h-4 w-4" />
          <div className="font-semibold mb-1">Detection Result</div>
          <div className="text-sm">
            Detected Source: {sourceDetection.source} ({Math.round(sourceDetection.confidence * 100)}% confidence).
            {sourceDetection.evidence.length > 0 && ` Evidence: ${sourceDetection.evidence.join(", ")}`}
          </div>
        </Alert>
      )}

      {preview && !importResult && (
        <div className="space-y-4">
          {status === "NEEDS_REVIEW" && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <div className="font-semibold mb-1">Manual Review Required</div>
              <div className="text-sm">
                Some trade rows or values require manual verification. Please inspect flagged entries before confirming.
              </div>
            </Alert>
          )}

          <div className="flex gap-4 mb-4">
            <div className="p-4 rounded border bg-card flex-1">
              <div className="text-sm text-muted-foreground">Ready to Import</div>
              <div className="text-2xl font-bold text-green-500">{preview.readyCount}</div>
            </div>
            <div className="p-4 rounded border bg-card flex-1">
              <div className="text-sm text-muted-foreground">Duplicates</div>
              <div className="text-2xl font-bold text-yellow-500">{preview.duplicateCount}</div>
            </div>
            <div className="p-4 rounded border bg-card flex-1">
              <div className="text-sm text-muted-foreground">Errors</div>
              <div className="text-2xl font-bold text-red-500">{preview.errorCount}</div>
            </div>
            {typeof preview.nonTradeCount === "number" && preview.nonTradeCount > 0 && (
              <div className="p-4 rounded border bg-card flex-1">
                <div className="text-sm text-muted-foreground">Non-Trades Excluded</div>
                <div className="text-2xl font-bold text-slate-400">{preview.nonTradeCount}</div>
              </div>
            )}
          </div>

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-left">Side</th>
                  <th className="p-3 text-left">Lots</th>
                  <th className="p-3 text-left">Entry Price</th>
                  <th className="p-3 text-left">P&L</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.candidates.map((c, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <input
                        type="text"
                        value={c.title || ""}
                        placeholder="e.g. NAS100"
                        onChange={(e) => handleCandidateChange(i, "title", e.target.value)}
                        className={`bg-background border rounded px-2.5 py-1 text-sm font-semibold w-32 uppercase outline-none transition-colors ${
                          !c.title ? "border-red-500 bg-red-500/10 text-red-200" : "border-input focus:border-primary"
                        }`}
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={c.side || "LONG"}
                        onChange={(e) => handleCandidateChange(i, "side", e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer border outline-none ${
                          c.side === "LONG" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        <option value="LONG" className="bg-card text-foreground">LONG</option>
                        <option value="SHORT" className="bg-card text-foreground">SHORT</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={c.quantity || "0.01"}
                        onChange={(e) => handleCandidateChange(i, "quantity", e.target.value)}
                        className="bg-background border border-input focus:border-primary rounded px-2.5 py-1 text-sm w-20 outline-none font-mono"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={c.entryPrice || ""}
                        onChange={(e) => handleCandidateChange(i, "entryPrice", e.target.value)}
                        className="bg-background border border-input focus:border-primary rounded px-2.5 py-1 text-sm w-28 outline-none font-mono"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={c.grossPnl || ""}
                        onChange={(e) => handleCandidateChange(i, "grossPnl", e.target.value)}
                        className={`bg-background border border-input focus:border-primary rounded px-2.5 py-1 text-sm w-28 outline-none font-mono ${
                          Number(c.grossPnl) >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      />
                    </td>
                    <td className="p-3">
                      {c.duplicateMatch?.classification && c.duplicateMatch.classification !== "NONE" ? (
                        <span
                          className="text-yellow-600 flex items-center gap-1 cursor-help"
                          title={c.duplicateMatch?.reasons?.join(", ") || "Duplicate trade detected"}
                        >
                          <AlertCircle className="w-3 h-3" /> Duplicate
                        </span>
                      ) : !c.isValid ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-red-500 flex items-center gap-1 font-semibold text-xs">
                            <XCircle className="w-3.5 h-3.5 shrink-0" /> Invalid
                          </span>
                          <span className="text-[11px] text-red-400 font-normal leading-tight max-w-[150px]">
                            {c.validationIssues
                              ?.filter((issue) => issue.level === "ERROR")
                              .map((issue) => issue.message)
                              .join(", ") || "Verify trade values"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {preview.candidates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No trades could be extracted from this screenshot.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {preview.excludedRows && preview.excludedRows.length > 0 && (
            <div className="p-3 rounded-lg border bg-muted/40 text-xs text-muted-foreground flex flex-col gap-1">
              <span className="font-semibold text-foreground">Excluded non-trade rows:</span>
              <span className="leading-relaxed">
                {preview.excludedRows.map((r) => `${r.type}: "${r.rawText}"`).join(" • ")}
              </span>
            </div>
          )}

          {error && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <div className="text-sm">{error}</div>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => {
                setPreview(null);
                setSourceDetection(null);
              }}
              disabled={isConfirming}
            >
              Go Back
            </Button>
            <Button onClick={handleConfirm} disabled={isConfirming || preview.readyCount === 0}>
              {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isConfirming ? "Importing..." : `Import ${preview.readyCount} Trades`}
            </Button>
          </div>
        </div>
      )}

      {importResult && (
        <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <div className="font-semibold mb-1 text-green-800 dark:text-green-300">Import Complete</div>
          <div className="text-sm text-green-700 dark:text-green-400">
            Successfully imported {importResult.successful} trades.
            {importResult.failed > 0 && ` (${importResult.failed} failed)`}
          </div>
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-1">
              {importResult.errors.map((err, idx) => (
                <div key={idx}>• {err.error}</div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 transition-all duration-200"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/trades"
              className="inline-flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-2 text-sm bg-slate-800 text-slate-200 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 transition-all duration-200"
            >
              View Trades
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setPreview(null);
                setImportResult(null);
                setSourceDetection(null);
                setFile(null);
              }}
            >
              Import Another Screenshot
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}
