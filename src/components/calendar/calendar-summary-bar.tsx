/**
 * Calendar Domain — Month Summary Bar Component
 *
 * Provides a dense, professional performance summary for the visible month:
 * Net P&L, Win Rate, Total Trades, Winning/Losing Days, Best/Worst Day, and Daily Avg.
 */

import React from "react";
import type { CalendarMonthSummaryDto } from "@/lib/client/calendar";

interface CalendarSummaryBarProps {
  summary: CalendarMonthSummaryDto;
}

function formatCurrency(valStr: string | null | undefined): string {
  if (!valStr) return "$0.00";
  const num = parseFloat(valStr);
  if (isNaN(num)) return "$0.00";
  const sign = num > 0 ? "+" : num < 0 ? "-" : "";
  const abs = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
}

export function CalendarSummaryBar({ summary }: CalendarSummaryBarProps) {
  const netPnlNum = parseFloat(summary.netPnl || "0");
  const isPnlPositive = netPnlNum > 0;
  const isPnlNegative = netPnlNum < 0;

  const avgPnlNum = parseFloat(summary.averageDailyPnl || "0");

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      data-testid="calendar-summary-bar"
    >
      {/* 1. Net P&L */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm">
        <div className="text-[11px] font-medium text-slate-400">Monthly Net P&L</div>
        <div
          className={`text-lg sm:text-xl font-bold font-mono mt-1 ${
            isPnlPositive
              ? "text-emerald-400"
              : isPnlNegative
                ? "text-rose-400"
                : "text-slate-300"
          }`}
          data-testid="summary-net-pnl"
        >
          {formatCurrency(summary.netPnl)}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          {summary.closedTrades} closed / {summary.openTrades} open
        </div>
      </div>

      {/* 2. Win Rate & Trade Count */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm">
        <div className="text-[11px] font-medium text-slate-400">Win Rate</div>
        <div
          className={`text-lg sm:text-xl font-bold font-mono mt-1 ${
            summary.winRate >= 50
              ? "text-emerald-400"
              : summary.winRate > 0
                ? "text-amber-400"
                : "text-slate-300"
          }`}
          data-testid="summary-win-rate"
        >
          {summary.winRate}%
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          {summary.winningTrades}W • {summary.losingTrades}L • {summary.breakevenTrades}BE
        </div>
      </div>

      {/* 3. Trading Days Distribution */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm">
        <div className="text-[11px] font-medium text-slate-400">Day Record</div>
        <div className="text-lg sm:text-xl font-bold font-mono mt-1 text-slate-100 flex items-center gap-1.5">
          <span className="text-emerald-400">{summary.winningDays}W</span>
          <span className="text-slate-600">/</span>
          <span className="text-rose-400">{summary.losingDays}L</span>
          {summary.breakevenDays > 0 && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{summary.breakevenDays}BE</span>
            </>
          )}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          {summary.winningDays + summary.losingDays + summary.breakevenDays} active trading days
        </div>
      </div>

      {/* 4. Average Daily P&L */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm">
        <div className="text-[11px] font-medium text-slate-400">Avg Daily P&L</div>
        <div
          className={`text-lg sm:text-xl font-bold font-mono mt-1 ${
            avgPnlNum > 0
              ? "text-emerald-400"
              : avgPnlNum < 0
                ? "text-rose-400"
                : "text-slate-300"
          }`}
          data-testid="summary-avg-daily"
        >
          {formatCurrency(summary.averageDailyPnl)}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          per active trading day
        </div>
      </div>

      {/* 5. Best Trading Day */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm">
        <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
          <span>Best Day</span>
          {summary.bestDay && (
            <span className="text-[10px] text-emerald-400 font-mono">
              {summary.bestDay.date.slice(5)}
            </span>
          )}
        </div>
        <div
          className="text-lg sm:text-xl font-bold font-mono mt-1 text-emerald-400"
          data-testid="summary-best-day"
        >
          {summary.bestDay ? formatCurrency(summary.bestDay.netPnl) : "—"}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          {summary.bestDay ? summary.bestDay.date : "No winning days"}
        </div>
      </div>

      {/* 6. Worst Trading Day */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm">
        <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
          <span>Worst Day</span>
          {summary.worstDay && (
            <span className="text-[10px] text-rose-400 font-mono">
              {summary.worstDay.date.slice(5)}
            </span>
          )}
        </div>
        <div
          className="text-lg sm:text-xl font-bold font-mono mt-1 text-rose-400"
          data-testid="summary-worst-day"
        >
          {summary.worstDay ? formatCurrency(summary.worstDay.netPnl) : "—"}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          {summary.worstDay ? summary.worstDay.date : "No losing days"}
        </div>
      </div>
    </div>
  );
}
