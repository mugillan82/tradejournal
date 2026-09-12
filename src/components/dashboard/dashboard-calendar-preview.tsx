/**
 * Dashboard Domain — Calendar Preview Component
 *
 * Compact month heatmap overview showing daily trading activity and links to full calendar.
 */

"use client";

import React from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, ExternalLink } from "@/components/icons";
import type { MonthCalendarDto } from "@/lib/client/dashboard";

interface DashboardCalendarPreviewProps {
  calendar: MonthCalendarDto;
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

export function DashboardCalendarPreview({ calendar }: DashboardCalendarPreviewProps) {
  const tradedDays = Object.values(calendar.days).filter((d) => d.tradeCount > 0);
  const totalTradingDays =
    calendar.summary.winningDays +
    calendar.summary.losingDays +
    calendar.summary.breakevenDays;

  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4"
      data-testid="dashboard-calendar-preview"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-100">
            Performance Calendar ({calendar.month})
          </h2>
        </div>
        <Link
          href={`/calendar?month=${calendar.month}`}
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          <span>Open Full Calendar</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800/80">
          <span className="text-[11px] text-slate-400">Trading Days</span>
          <div className="text-lg font-bold text-slate-100 mt-0.5">
            {totalTradingDays} days
          </div>
        </div>

        <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800/80">
          <span className="text-[11px] text-slate-400">Winning Days</span>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">
            {calendar.summary.winningDays} days
          </div>
        </div>

        <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800/80">
          <span className="text-[11px] text-slate-400">Best Day</span>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">
            {calendar.summary.bestDay ? formatCurrency(calendar.summary.bestDay.netPnl) : "—"}
          </div>
        </div>

        <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800/80">
          <span className="text-[11px] text-slate-400">Worst Day</span>
          <div className="text-lg font-bold text-rose-400 mt-0.5">
            {calendar.summary.worstDay ? formatCurrency(calendar.summary.worstDay.netPnl) : "—"}
          </div>
        </div>
      </div>

      {/* Mini Days Ribbon */}
      <div className="space-y-2">
        <span className="text-xs text-slate-400 font-medium">Recent Trading Days Activity:</span>
        {tradedDays.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500">
            No closed trades logged in {calendar.month} yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tradedDays.slice(-10).map((day) => {
              const pnlNum = parseFloat(day.netPnl || "0");
              const isPositive = pnlNum > 0;
              const isNegative = pnlNum < 0;

              return (
                <Link
                  key={day.date}
                  href={`/calendar?month=${calendar.month}&date=${day.date}`}
                  className={`px-2.5 py-1.5 rounded-md text-xs border transition-colors flex items-center gap-2 ${
                    isPositive
                      ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/50"
                      : isNegative
                        ? "bg-rose-950/40 border-rose-800/50 text-rose-300 hover:bg-rose-900/50"
                        : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span className="font-medium">{day.date.slice(5)}</span>
                  <span className="font-bold font-mono">{formatCurrency(day.netPnl)}</span>
                  <span className="text-[10px] opacity-75">({day.tradeCount}T)</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
