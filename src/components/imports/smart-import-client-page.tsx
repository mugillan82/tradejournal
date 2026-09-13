"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { TradingAccountDto } from "@/lib/trading/account/types";
import { fetchTradingAccountsClient } from "@/lib/client/accounts";
import { SourceDetectionResult } from "@/lib/trading/smart-import/types";
import type { NormalizedTradeCandidate } from "@/lib/trading/import/types";
import type { ConfirmImportResult } from "@/lib/trading/import/service";

interface ImportPreview {
  candidates: NormalizedTradeCandidate[];
  duplicateCount: number;
  errorCount: number;
  readyCount: number;
}

export function SmartImportClientPage() {
  const [file, setFile] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<TradingAccountDto[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");

  const [sourceDetection, setSourceDetection] = useState<SourceDetectionResult | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ConfirmImportResult | null>(null);

  useEffect(() => {
    fetchTradingAccountsClient()
      .then((res) => {
        setAccounts([...(res.items || [])]);
        if (res.items && res.items.length > 0) setSelectedAccountId(res.items[0].id);
      })
      .catch(() => setError("Failed to load accounts."));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setSourceDetection(null);
      setImportResult(null);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!selectedAccountId) {
      setError("Please select a trading account.");
      return;
    }

    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("screenshot", file);
    formData.append("tradingAccountId", selectedAccountId);

    try {
      const res = await fetch("/api/imports/smart/preview", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as {
        error?: string;
        sourceDetection?: SourceDetectionResult;
        preview?: ImportPreview;
      };
      if (!res.ok) throw new Error(data.error || "Failed to process screenshot");

      if (data.sourceDetection) setSourceDetection(data.sourceDetection);
      if (data.preview) setPreview(data.preview);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload screenshot");
    } finally {
      setIsLoading(false);
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
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                <div className="font-semibold mb-1">Error</div>
                <div className="text-sm">{error}</div>
              </Alert>
            )}

            <Button onClick={handleUpload} disabled={!file || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Processing..." : "Extract Trades"}
            </Button>
          </div>
        </div>
      )}

      {sourceDetection && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <div className="font-semibold mb-1">Detection Result</div>
          <div className="text-sm">
            Detected Source: {sourceDetection.source} ({(sourceDetection.confidence * 100).toFixed(0)}% confidence).
            <br />
            Evidence: {sourceDetection.evidence.join(", ")}
          </div>
        </Alert>
      )}

      {preview && !importResult && (
        <div className="space-y-4">
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
          </div>

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-left">Side</th>
                  <th className="p-3 text-left">Entry Price</th>
                  <th className="p-3 text-left">P&L</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.candidates.map((c, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3 font-medium">{c.title || "Unknown"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          c.side === "LONG" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {c.side}
                      </span>
                    </td>
                    <td className="p-3">{c.entryPrice}</td>
                    <td className="p-3">{c.grossPnl || "-"}</td>
                    <td className="p-3">
                      {c.duplicateMatch?.classification !== "NONE" ? (
                        <span className="text-yellow-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Duplicate
                        </span>
                      ) : !c.isValid ? (
                        <span className="text-red-600 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Invalid
                        </span>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {preview.candidates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No trades could be extracted from this screenshot.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <div className="font-semibold mb-1 text-green-800">Import Complete</div>
          <div className="text-sm text-green-700">
            Successfully imported {importResult.successful} trades. {importResult.failed} failed.
          </div>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setPreview(null);
              setImportResult(null);
              setSourceDetection(null);
              setFile(null);
            }}
          >
            Import Another Screenshot
          </Button>
        </Alert>
      )}
    </div>
  );
}
