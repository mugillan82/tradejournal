/**
 * Trade Detail View Component
 *
 * Production-grade Trade Detail and Management experience.
 * Features:
 * - Real-time trade data fetching and rehydration
 * - Prominent P&L / R-Multiple hero section
 * - Detailed execution, risk, and cost metrics
 * - Contextual strategy, setup, and notes inspection
 * - Edit Trade modal workflow
 * - Destructive Delete Trade confirmation dialog
 * - Complete loading, error, and not-found handling
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  AlertCircle,
  RefreshCw,
  LineChart,
  Target,
  DollarSign,
  Clock,
  Pencil,
  Trash2,
  Copy,
  Check,
} from "@/components/icons";
import {
  fetchTradeById,
  fetchTradingAccounts,
  TradeClientApiError,
} from "@/lib/client/trades";
import type { TradeDto } from "@/lib/trading/trade/types";
import type { TradingAccountDto } from "@/lib/trading/account/types";
import { EditTradeModal } from "./edit-trade-modal";
import { DeleteTradeDialog } from "./delete-trade-dialog";
import { TradeAttachmentsSection } from "./trade-attachments-section";
import { TradeNotesSection } from "./trade-notes-section";

interface TradeDetailViewProps {
  tradeId: string;
}

function formatDate(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(valStr: string | null): string {
  if (valStr === null || valStr === undefined) return "—";
  const num = parseFloat(valStr);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDecimal(valStr: string | null, decimals = 2): string {
  if (valStr === null || valStr === undefined) return "—";
  const num = parseFloat(valStr);
  if (isNaN(num)) return "—";
  return num.toFixed(decimals);
}

function computeDuration(entryDate: Date, exitDate: Date | null): string {
  if (!entryDate || isNaN(entryDate.getTime())) return "—";
  const end = exitDate && !isNaN(exitDate.getTime()) ? exitDate.getTime() : Date.now();
  const diffMs = Math.max(0, end - entryDate.getTime());

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  const formatted = parts.join(" ");
  return exitDate ? formatted : `${formatted} (Open)`;
}

export function TradeDetailView({ tradeId }: TradeDetailViewProps) {
  const [trade, setTrade] = useState<TradeDto | null>(null);
  const [accounts, setAccounts] = useState<ReadonlyArray<TradingAccountDto>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const [tradeData, accountsData] = await Promise.all([
        fetchTradeById(tradeId),
        fetchTradingAccounts(),
      ]);
      setTrade(tradeData);
      setAccounts(accountsData);
    } catch (err: unknown) {
      if (err instanceof TradeClientApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(
          err instanceof TradeClientApiError
            ? err.message
            : "An unexpected error occurred while loading trade details.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    let isMounted = true;

    async function execute() {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const [tradeData, accountsData] = await Promise.all([
          fetchTradeById(tradeId),
          fetchTradingAccounts(),
        ]);
        if (isMounted) {
          setTrade(tradeData);
          setAccounts(accountsData);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (err instanceof TradeClientApiError && err.status === 404) {
            setNotFound(true);
          } else {
            setError(
              err instanceof TradeClientApiError
                ? err.message
                : "An unexpected error occurred while loading trade details.",
            );
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    execute();

    return () => {
      isMounted = false;
    };
  }, [tradeId]);

  const handleCopyId = () => {
    if (!trade) return;
    navigator.clipboard.writeText(trade.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleTradeUpdated = (updatedTrade: TradeDto) => {
    setTrade(updatedTrade);
  };

  // Find account name
  const account = accounts.find((a) => a.id === trade?.tradingAccountId);
  const accountName = account ? account.name : "Trading Account";

  // Calculations for hero metrics
  const netPnlNum = parseFloat(trade?.netPnl || "0");
  const commissionNum = parseFloat(trade?.commission || "0");
  const feesNum = parseFloat(trade?.fees || "0");
  const swapNum = parseFloat(trade?.swap || "0");
  const totalCosts = (isNaN(commissionNum) ? 0 : commissionNum) +
    (isNaN(feesNum) ? 0 : feesNum) +
    (isNaN(swapNum) ? 0 : swapNum);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/trades"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors w-fit"
        >
          <ChevronLeft size={16} />
          <span>Back to Trades Log</span>
        </Link>

        {trade && !isLoading && !notFound && !error && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Pencil size={14} className="text-emerald-400" />
              <span>Edit Trade</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-900/40 bg-rose-950/20 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="h-6 w-48 bg-slate-800 rounded" />
            <div className="h-12 w-64 bg-slate-800/80 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-800/50 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-slate-900/40 border border-slate-800 rounded-2xl" />
            <div className="h-64 bg-slate-900/40 border border-slate-800 rounded-2xl" />
          </div>
        </div>
      ) : notFound ? (
        /* Not Found State */
        <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-10 text-center space-y-4 shadow-xl">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-amber-200">Trade Record Not Found</h2>
          <p className="text-xs text-amber-300/80 max-w-md mx-auto leading-relaxed">
            The trade with ID <code className="font-mono bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-200">{tradeId}</code> does not exist or belongs to another user account.
          </p>
          <div className="pt-2">
            <Link
              href="/trades"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/30"
            >
              Return to Trades Log
            </Link>
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-10 text-center space-y-4 shadow-xl">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-rose-200">Failed to Load Trade Details</h2>
          <p className="text-xs text-rose-300/80 max-w-md mx-auto leading-relaxed">{error}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <RefreshCw size={14} />
              <span>Retry Request</span>
            </button>
          </div>
        </div>
      ) : trade ? (
        /* Complete Trade Detail View */
        <div className="space-y-6">
          {/* HERO SUMMARY CARD */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div
              className={[
                "absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl pointer-events-none opacity-20",
                trade.netPnl && netPnlNum > 0
                  ? "bg-emerald-500"
                  : trade.netPnl && netPnlNum < 0
                  ? "bg-rose-500"
                  : "bg-cyan-500",
              ].join(" ")}
            />

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Side Badge */}
                  <span
                    className={[
                      "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wide",
                      trade.side === "LONG"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30",
                    ].join(" ")}
                  >
                    {trade.side}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={[
                      "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide",
                      trade.status === "OPEN"
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                        : trade.status === "CLOSED"
                        ? "bg-slate-800 text-slate-300 border border-slate-700"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30",
                    ].join(" ")}
                  >
                    {trade.status}
                  </span>

                  {/* Account Badge */}
                  <span className="text-xs text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800 font-medium">
                    {accountName}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                  {trade.title || `Trade #${trade.id.slice(0, 8)}`}
                </h1>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>ID: {trade.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    aria-label="Copy trade ID"
                    className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Main Net P&L Display */}
              <div className="md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-slate-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Net Realized P&amp;L
                </span>
                <span
                  className={[
                    "text-3xl sm:text-4xl font-black font-mono tracking-tight",
                    trade.netPnl !== null
                      ? netPnlNum > 0
                        ? "text-emerald-400"
                        : netPnlNum < 0
                        ? "text-rose-400"
                        : "text-slate-300"
                      : "text-slate-500",
                  ].join(" ")}
                >
                  {formatCurrency(trade.netPnl)}
                </span>
                {trade.actualRMultiple && (
                  <span className="block text-xs font-bold font-mono text-emerald-400 mt-1">
                    +{formatDecimal(trade.actualRMultiple, 2)}R Multiplier
                  </span>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80 font-mono text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Gross P&amp;L
                </span>
                <span className="font-semibold text-slate-200">
                  {formatCurrency(trade.grossPnl)}
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Total Costs
                </span>
                <span className="font-semibold text-slate-300">
                  {totalCosts > 0 ? `-${formatCurrency(totalCosts.toString())}` : "$0.00"}
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Holding Time
                </span>
                <span className="font-semibold text-slate-200">
                  {computeDuration(trade.entryDate, trade.exitDate)}
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Planned R:R
                </span>
                <span className="font-semibold text-slate-200">
                  {trade.plannedRiskReward ? `1 : ${formatDecimal(trade.plannedRiskReward, 2)}` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID FOR DETAILED PANELS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PANEL 1: EXECUTION DETAILS */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <DollarSign size={16} className="text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Execution Metrics
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div>
                  <span className="text-[11px] font-sans text-slate-400 block mb-0.5">
                    Entry Price
                  </span>
                  <span className="text-base font-bold text-slate-100">
                    ${trade.entryPrice}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-sans text-slate-400 block mb-0.5">
                    Exit Price
                  </span>
                  <span className="text-base font-bold text-slate-100">
                    {trade.exitPrice ? `$${trade.exitPrice}` : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-sans text-slate-400 block mb-0.5">
                    Quantity / Size
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    {trade.quantity}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-sans text-slate-400 block mb-0.5">
                    Total Volume
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    {formatCurrency(
                      (parseFloat(trade.entryPrice) * parseFloat(trade.quantity)).toString(),
                    )}
                  </span>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-800/60 space-y-2">
                  <div>
                    <span className="text-[11px] font-sans text-slate-400 block">
                      Entry Timestamp:
                    </span>
                    <span className="text-slate-200 font-medium font-sans">
                      {formatDate(trade.entryDate)}
                    </span>
                  </div>
                  {trade.exitDate && (
                    <div>
                      <span className="text-[11px] font-sans text-slate-400 block">
                        Exit Timestamp:
                      </span>
                      <span className="text-slate-200 font-medium font-sans">
                        {formatDate(trade.exitDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PANEL 2: RISK & MANAGEMENT */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Target size={16} className="text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Risk &amp; Targets
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div>
                  <span className="text-[11px] font-sans text-slate-400 block mb-0.5">
                    Stop Loss Price
                  </span>
                  <span className="text-sm font-semibold text-rose-400">
                    {trade.stopLoss ? `$${trade.stopLoss}` : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-sans text-slate-400 block mb-0.5">
                    Take Profit Price
                  </span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {trade.takeProfit ? `$${trade.takeProfit}` : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-sans text-slate-400 block mb-0.5">
                    Account Risk ($)
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    {trade.riskAmount ? formatCurrency(trade.riskAmount) : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-sans text-slate-400 block mb-0.5">
                    Realized R Multiple
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    {trade.actualRMultiple ? `${formatDecimal(trade.actualRMultiple, 2)}R` : "—"}
                  </span>
                </div>

                {/* Costs Sub-block */}
                <div className="col-span-2 pt-2 border-t border-slate-800/60">
                  <span className="text-[11px] font-sans text-slate-400 block mb-2">
                    Cost Breakdown:
                  </span>
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Comm</span>
                      <span className="text-slate-300 font-medium">
                        {formatCurrency(trade.commission)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Fees</span>
                      <span className="text-slate-300 font-medium">
                        {formatCurrency(trade.fees)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Swap</span>
                      <span className="text-slate-300 font-medium">
                        {formatCurrency(trade.swap)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL 3: STRATEGY & JOURNAL NOTES */}
            <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <LineChart size={16} className="text-emerald-400" />
                  <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                    Strategy &amp; Journal Reflections
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {trade.strategyId && (
                    <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
                      Strategy: {trade.strategyId}
                    </span>
                  )}
                  {trade.setupId && (
                    <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
                      Setup: {trade.setupId}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  Trade Notes &amp; Review
                </span>
                {trade.notes ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {trade.notes}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No notes recorded for this trade execution. Click &quot;Edit Trade&quot; above to log your execution thoughts.
                  </p>
                )}
              </div>

              {/* Tags & Mistakes advisory */}
              <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-xs text-slate-400 flex items-start gap-2">
                <span className="text-slate-500 mt-0.5" aria-hidden="true">•</span>
                <p>
                  Tags and Mistakes taggings will be managed through dedicated tag assignment tools in upcoming updates.
                </p>
              </div>
            </div>

            {/* PANEL 4: METADATA & AUDIT */}
            <div className="md:col-span-2 rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-600" />
                <span>Created: {formatDate(trade.createdAt)}</span>
              </div>
              <div>
                <span>Last Updated: {formatDate(trade.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* TRADE EXECUTION NOTES SECTION */}
          <TradeNotesSection tradeId={trade.id} />

          {/* ATTACHMENTS & EVIDENCE SECTION */}
          <TradeAttachmentsSection tradeId={trade.id} />

          {/* Edit Modal */}
          <EditTradeModal
            trade={trade}
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSave={handleTradeUpdated}
          />

          {/* Delete Confirmation Dialog */}
          <DeleteTradeDialog
            trade={trade}
            isOpen={isDeleteOpen}
            onClose={() => setIsDeleteOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
