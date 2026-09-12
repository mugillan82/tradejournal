/**
 * Dashboard Domain — Performance Breakdowns Section
 *
 * Compact high-value breakdown cards for Top Symbols, Top Strategies, and Long vs Short.
 */

"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Layers, PieChart } from "@/components/icons";
import type {
  PerformanceBySymbolItemDto,
  PerformanceByStrategyItemDto,
  DashboardDirectionSummaryDto,
} from "@/lib/client/dashboard";

interface DashboardBreakdownsSectionProps {
  topSymbols: ReadonlyArray<PerformanceBySymbolItemDto>;
  topStrategies: ReadonlyArray<PerformanceByStrategyItemDto>;
  direction: DashboardDirectionSummaryDto;
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

export function DashboardBreakdownsSection({
  topSymbols,
  topStrategies,
  direction,
}: DashboardBreakdownsSectionProps) {
  const longPnl = parseFloat(direction.long.netPnl || "0");
  const shortPnl = parseFloat(direction.short.netPnl || "0");

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-5"
      data-testid="dashboard-breakdowns-section"
    >
      {/* 1. Top Symbols */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-indigo-400" />
              <span>Top Symbols</span>
            </h3>
            <Link
              href="/reports?tab=symbols"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Report →
            </Link>
          </div>

          {topSymbols.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No symbol performance data.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50 mt-2">
              {topSymbols.map((s) => {
                const pnl = parseFloat(s.netPnl || "0");
                return (
                  <div key={s.symbol} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200 uppercase">{s.symbol}</span>
                      <span className="text-[11px] text-slate-400 ml-2">
                        {s.tradeCount} trades • {s.winRate}% WR
                      </span>
                    </div>
                    <span
                      className={`font-semibold font-mono ${
                        pnl > 0
                          ? "text-emerald-400"
                          : pnl < 0
                            ? "text-rose-400"
                            : "text-slate-300"
                      }`}
                    >
                      {formatCurrency(s.netPnl)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Strategies */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Top Strategies</span>
            </h3>
            <Link
              href="/reports?tab=strategies"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Report →
            </Link>
          </div>

          {topStrategies.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No strategy performance data.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50 mt-2">
              {topStrategies.map((st) => {
                const pnl = parseFloat(st.netPnl || "0");
                return (
                  <div key={st.strategyId} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-200">{st.strategyName}</span>
                      <span className="text-[11px] text-slate-400 ml-2">
                        {st.tradeCount} trades • {st.winRate}% WR
                      </span>
                    </div>
                    <span
                      className={`font-semibold font-mono ${
                        pnl > 0
                          ? "text-emerald-400"
                          : pnl < 0
                            ? "text-rose-400"
                            : "text-slate-300"
                      }`}
                    >
                      {formatCurrency(st.netPnl)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Direction (Long vs Short) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>Directional Split</span>
            </h3>
            <Link
              href="/reports?tab=direction"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Report →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Long Card */}
            <div className="rounded-lg border border-emerald-950 bg-emerald-950/20 p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                <span>LONG</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <div
                className={`text-sm font-extrabold font-mono ${
                  longPnl > 0
                    ? "text-emerald-400"
                    : longPnl < 0
                      ? "text-rose-400"
                      : "text-slate-300"
                }`}
              >
                {formatCurrency(direction.long.netPnl)}
              </div>
              <div className="text-[10px] text-slate-400">
                {direction.long.tradeCount} trades ({direction.long.winRate}% WR)
              </div>
            </div>

            {/* Short Card */}
            <div className="rounded-lg border border-rose-950 bg-rose-950/20 p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-rose-400 font-bold">
                <span>SHORT</span>
                <ArrowDownRight className="w-3.5 h-3.5" />
              </div>
              <div
                className={`text-sm font-extrabold font-mono ${
                  shortPnl > 0
                    ? "text-emerald-400"
                    : shortPnl < 0
                      ? "text-rose-400"
                      : "text-slate-300"
                }`}
              >
                {formatCurrency(direction.short.netPnl)}
              </div>
              <div className="text-[10px] text-slate-400">
                {direction.short.tradeCount} trades ({direction.short.winRate}% WR)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
