/**
 * Dashboard Domain — Today & Current Period Performance Card
 *
 * Highlights daily realized P&L and monthly progress metrics.
 */

"use client";

import React from "react";
import { Calendar, Clock } from "@/components/icons";
import type { DashboardTodaySummaryDto, DashboardMonthSummaryDto } from "@/lib/client/dashboard";

interface DashboardTodayCardProps {
  today: DashboardTodaySummaryDto;
  currentMonth: DashboardMonthSummaryDto;
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

export function DashboardTodayCard({ today, currentMonth }: DashboardTodayCardProps) {
  const todayPnlNum = parseFloat(today.netPnl || "0");
  const monthPnlNum = parseFloat(currentMonth.netPnl || "0");

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      data-testid="dashboard-today-card"
    >
      {/* Today's Context */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Today&apos;s Performance</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            UTC Today
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div
            className={`text-2xl font-bold ${
              todayPnlNum > 0
                ? "text-emerald-400"
                : todayPnlNum < 0
                  ? "text-rose-400"
                  : "text-slate-200"
            }`}
          >
            {formatCurrency(today.netPnl)}
          </div>
          <div className="text-xs text-slate-400">
            {today.tradeCount === 0 ? (
              <span>No trades closed today</span>
            ) : (
              <span>
                <span className="text-emerald-400 font-medium">{today.winCount}W</span> •{" "}
                <span className="text-rose-400 font-medium">{today.lossCount}L</span> (
                {today.winRate}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Current Month Context */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Current Month ({currentMonth.monthStr})</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            Month-to-date
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div
            className={`text-2xl font-bold ${
              monthPnlNum > 0
                ? "text-emerald-400"
                : monthPnlNum < 0
                  ? "text-rose-400"
                  : "text-slate-200"
            }`}
          >
            {formatCurrency(currentMonth.netPnl)}
          </div>
          <div className="text-xs text-slate-400">
            {currentMonth.tradeCount === 0 ? (
              <span>No trades closed this month</span>
            ) : (
              <span>
                <strong className="text-slate-200">{currentMonth.tradeCount}</strong> trades •{" "}
                <span className="text-emerald-400 font-medium">{currentMonth.winCount}W</span>{" "}
                <span className="text-rose-400 font-medium">{currentMonth.lossCount}L</span> (
                {currentMonth.winRate}%)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
