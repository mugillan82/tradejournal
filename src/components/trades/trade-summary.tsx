/**
 * Trade Summary Component
 *
 * Lightweight header summary derived from currently loaded trade data.
 * Displays key context without building full dashboard/analytics metrics.
 */

import type { TradeDto } from "@/lib/trading/trade/types";

interface TradeSummaryProps {
  trades: ReadonlyArray<TradeDto>;
  total: number;
  isLoading?: boolean;
}

function formatPnl(amountStr: string | null): { formatted: string; isPositive: boolean; isNegative: boolean } {
  if (amountStr === null || amountStr === undefined) {
    return { formatted: "$0.00", isPositive: false, isNegative: false };
  }
  const num = parseFloat(amountStr);
  if (isNaN(num)) {
    return { formatted: "$0.00", isPositive: false, isNegative: false };
  }
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return {
    formatted,
    isPositive: num > 0,
    isNegative: num < 0,
  };
}

export function TradeSummary({ trades, total, isLoading }: TradeSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl border border-slate-800 bg-slate-900/40 p-4 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const openCount = trades.filter((t) => t.status === "OPEN").length;
  const closedTrades = trades.filter((t) => t.status === "CLOSED" && t.netPnl !== null);
  const closedCount = closedTrades.length;

  let totalNetPnl = 0;
  let winCount = 0;

  for (const t of closedTrades) {
    if (t.netPnl) {
      const val = parseFloat(t.netPnl);
      if (!isNaN(val)) {
        totalNetPnl += val;
        if (val > 0) winCount++;
      }
    }
  }

  const winRate = closedCount > 0 ? ((winCount / closedCount) * 100).toFixed(1) : "—";
  const pnlInfo = formatPnl(totalNetPnl.toString());

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {/* Total Trades */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs font-medium text-slate-400">Total Records</p>
        <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
          {total}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {trades.length} loaded on page
        </p>
      </div>

      {/* Open Positions */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs font-medium text-slate-400">Open Trades</p>
        <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-cyan-400">
          {openCount}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">Active positions</p>
      </div>

      {/* Loaded Net P&L */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs font-medium text-slate-400">Page Net P&L</p>
        <p
          className={[
            "mt-1 text-xl sm:text-2xl font-bold tracking-tight",
            pnlInfo.isPositive
              ? "text-emerald-400"
              : pnlInfo.isNegative
              ? "text-rose-400"
              : "text-slate-200",
          ].join(" ")}
        >
          {pnlInfo.formatted}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">From loaded page</p>
      </div>

      {/* Loaded Win Rate */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs font-medium text-slate-400">Page Win Rate</p>
        <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
          {winRate === "—" ? "—" : `${winRate}%`}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {closedCount} closed trades
        </p>
      </div>
    </div>
  );
}
