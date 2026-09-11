/**
 * Trade Detail Route — Minimal Workflow Placeholder
 *
 * Route: `/trades/[id]`
 *
 * Authenticated client page reading route ID, fetching trade details via
 * the Trade API (`/api/trades/[id]`), rendering trade parameters, and handling
 * loading, 404, error states, and back navigation.
 */

"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

import type { TradeDto } from "@/lib/trading/trade/types";
import { fetchTradeById, TradeClientApiError } from "@/lib/client/trades";
import { ChevronLeft, RefreshCw, AlertCircle } from "@/components/icons";

interface TradeDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "medium",
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

export default function TradeDetailPage({ params }: TradeDetailPageProps) {
  const { id } = use(params);

  const [trade, setTrade] = useState<TradeDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function executeLoad() {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const data = await fetchTradeById(id);
        if (isMounted) setTrade(data);
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
        if (isMounted) setIsLoading(false);
      }
    }

    executeLoad();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    fetchTradeById(id)
      .then((data) => setTrade(data))
      .catch((err: unknown) => {
        if (err instanceof TradeClientApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(
            err instanceof TradeClientApiError
              ? err.message
              : "An unexpected error occurred while loading trade details.",
          );
        }
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/trades"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Back to Trades</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-800 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-800/60 rounded" />
            ))}
          </div>
          <div className="h-24 bg-slate-800/40 rounded" />
        </div>
      ) : notFound ? (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-semibold text-amber-200">Trade Not Found</h2>
          <p className="text-sm text-amber-300/80 max-w-sm mx-auto">
            Trade with ID <code className="font-mono bg-amber-950/60 px-1 py-0.5 rounded text-amber-300">{id}</code> could not be found or does not belong to your account.
          </p>
          <div className="pt-2">
            <Link
              href="/trades"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Return to Trades List
            </Link>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-semibold text-rose-200">Error Loading Trade</h2>
          <p className="text-sm text-rose-300/80 max-w-sm mx-auto">{error}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
        </div>
      ) : trade ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/80">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={[
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase",
                    trade.side === "LONG"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                  ].join(" ")}
                >
                  {trade.side}
                </span>
                <span
                  className={[
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase",
                    trade.status === "OPEN"
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      : trade.status === "CLOSED"
                      ? "bg-slate-800 text-slate-300 border border-slate-700"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                  ].join(" ")}
                >
                  {trade.status}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-100">
                {trade.title || `Trade #${trade.id.slice(0, 8)}`}
              </h1>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 block">Net P&L</span>
              <span
                className={[
                  "text-xl font-extrabold font-mono",
                  parseFloat(trade.netPnl || "0") > 0
                    ? "text-emerald-400"
                    : parseFloat(trade.netPnl || "0") < 0
                    ? "text-rose-400"
                    : "text-slate-300",
                ].join(" ")}
              >
                {formatCurrency(trade.netPnl)}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-6 font-mono text-sm">
            <div>
              <span className="text-xs font-sans text-slate-400 block mb-1">Entry Price</span>
              <span className="text-slate-200 font-semibold">${trade.entryPrice}</span>
            </div>
            <div>
              <span className="text-xs font-sans text-slate-400 block mb-1">Exit Price</span>
              <span className="text-slate-200 font-semibold">
                {trade.exitPrice ? `$${trade.exitPrice}` : "—"}
              </span>
            </div>
            <div>
              <span className="text-xs font-sans text-slate-400 block mb-1">Quantity</span>
              <span className="text-slate-200 font-semibold">{trade.quantity}</span>
            </div>
            <div>
              <span className="text-xs font-sans text-slate-400 block mb-1">Actual R</span>
              <span className="text-slate-200 font-semibold">
                {trade.actualRMultiple ? `${trade.actualRMultiple}R` : "—"}
              </span>
            </div>
            <div>
              <span className="text-xs font-sans text-slate-400 block mb-1">Stop Loss</span>
              <span className="text-slate-200">{trade.stopLoss ? `$${trade.stopLoss}` : "—"}</span>
            </div>
            <div>
              <span className="text-xs font-sans text-slate-400 block mb-1">Take Profit</span>
              <span className="text-slate-200">{trade.takeProfit ? `$${trade.takeProfit}` : "—"}</span>
            </div>
            <div>
              <span className="text-xs font-sans text-slate-400 block mb-1">Gross P&L</span>
              <span className="text-slate-200">{formatCurrency(trade.grossPnl)}</span>
            </div>
            <div>
              <span className="text-xs font-sans text-slate-400 block mb-1">Commission / Fees</span>
              <span className="text-slate-200">
                {formatCurrency(trade.commission)} / {formatCurrency(trade.fees)}
              </span>
            </div>
          </div>

          {/* Dates & Metadata */}
          <div className="px-6 py-4 border-t border-slate-800/60 bg-slate-950/40 text-xs text-slate-400 space-y-2">
            <div>
              <span className="font-semibold text-slate-300">Entry Date:</span>{" "}
              {formatDate(trade.entryDate)}
            </div>
            {trade.exitDate && (
              <div>
                <span className="font-semibold text-slate-300">Exit Date:</span>{" "}
                {formatDate(trade.exitDate)}
              </div>
            )}
            {trade.notes && (
              <div className="pt-2 border-t border-slate-800/40 text-slate-300 font-sans">
                <span className="font-semibold text-slate-400 block mb-1">Notes:</span>
                <p className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                  {trade.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
