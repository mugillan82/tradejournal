/**
 * Analytics Domain — Performance Summary & Insights Cards
 *
 * Compact cards showing:
 * - Max Drawdown ($ & %)
 * - Peak & Ending Equity
 * - Streaks (Win, Loss, Current)
 * - Holding Duration (Avg & Total)
 * - Risk & R-Multiples
 */

import React from "react";
import type { CorePerformanceMetricsDto } from "@/lib/client/analytics";

interface AnalyticsSummaryCardsProps {
  metrics: CorePerformanceMetricsDto;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (d > 0) {
    return `${d}d ${h}h`;
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

function formatCurrency(amountStr: string | null | undefined): string {
  if (!amountStr) return "$0.00";
  const num = parseFloat(amountStr);
  if (isNaN(num)) return "$0.00";
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return isNeg ? `-${formatted}` : formatted;
}

export function AnalyticsSummaryCards({ metrics }: AnalyticsSummaryCardsProps) {
  const currentStreakBadge = () => {
    const { count, type } = metrics.currentStreak;
    if (count === 0 || type === "NONE") return { label: "No Active Streak", color: "text-slate-400 bg-slate-800" };
    if (type === "WIN") return { label: `${count} Win Streak`, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (type === "LOSS") return { label: `${count} Loss Streak`, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    return { label: `${count} Breakeven`, color: "text-slate-300 bg-slate-800" };
  };

  const streakInfo = currentStreakBadge();

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      data-testid="analytics-summary-cards"
    >
      {/* 1. Drawdown & Peak */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Max Drawdown
          </p>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {metrics.maxDrawdownPercentage !== null
              ? `-${metrics.maxDrawdownPercentage}%`
              : "Peak-to-Trough"}
          </span>
        </div>
        <p
          className="mt-2 text-xl font-bold tracking-tight text-rose-400 font-mono"
          data-testid="summary-max-drawdown"
        >
          -{formatCurrency(metrics.maxDrawdown)}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {metrics.peakEquity
            ? `Peak Equity: ${formatCurrency(metrics.peakEquity)}`
            : "From cumulative P&L peak"}
        </p>
      </div>

      {/* 2. Streaks */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Streaks & Momentum
          </p>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${streakInfo.color}`}
          >
            {streakInfo.label}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <div>
            <span className="text-xs text-slate-400 block">Best Win Streak</span>
            <span className="text-lg font-bold text-emerald-400" data-testid="summary-win-streak">
              {metrics.winningStreak} Trades
            </span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-xs text-slate-400 block">Worst Loss Streak</span>
            <span className="text-lg font-bold text-rose-400" data-testid="summary-loss-streak">
              {metrics.losingStreak} Trades
            </span>
          </div>
        </div>
      </div>

      {/* 3. Holding Duration */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Holding Time
          </p>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            Duration
          </span>
        </div>
        <p
          className="mt-2 text-xl font-bold tracking-tight text-slate-100 font-mono"
          data-testid="summary-avg-duration"
        >
          {formatDuration(metrics.averageHoldingDurationSeconds)}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Total Time:{" "}
          <span className="text-slate-300 font-medium">
            {formatDuration(metrics.totalHoldingDurationSeconds)}
          </span>
        </p>
      </div>

      {/* 4. Risk & R-Multiples */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Risk & R-Multiple
          </p>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
            {metrics.averageR ? `${metrics.averageR}R avg` : "—"}
          </span>
        </div>
        <p
          className="mt-2 text-xl font-bold tracking-tight text-slate-100 font-mono"
          data-testid="summary-total-risk"
        >
          {formatCurrency(metrics.totalRisk)}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Win R: <span className="text-emerald-400 font-medium">{metrics.averageWinningR ?? "—"}</span>
          {" · "}
          Loss R: <span className="text-rose-400 font-medium">{metrics.averageLosingR ?? "—"}</span>
        </p>
      </div>
    </div>
  );
}
