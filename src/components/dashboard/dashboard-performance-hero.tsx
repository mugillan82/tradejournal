/**
 * Dashboard Domain — Performance Hero Component
 *
 * Visually prominent command center summary featuring Net P&L, Win Rate,
 * Profit Factor, Expectancy, and Equity Curve progression.
 */

"use client";

import React from "react";
import { TrendingUp, TrendingDown, Target, Zap, Activity } from "@/components/icons";
import type { CorePerformanceMetricsDto, EquityCurvePointDto } from "@/lib/client/dashboard";
import { AnalyticsPerformanceChart } from "../analytics/analytics-performance-chart";

interface DashboardPerformanceHeroProps {
  metrics: CorePerformanceMetricsDto;
  equityCurve: ReadonlyArray<EquityCurvePointDto>;
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

export function DashboardPerformanceHero({
  metrics,
  equityCurve,
}: DashboardPerformanceHeroProps) {
  const netPnlNum = parseFloat(metrics.netPnl || "0");
  const isNetPositive = netPnlNum > 0;
  const isNetNegative = netPnlNum < 0;

  return (
    <div
      className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 sm:p-6 shadow-xl space-y-6"
      data-testid="dashboard-performance-hero"
    >
      {/* Top row: Primary Metric Highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Net P&L Main Card */}
        <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Net Realized P&L
            </span>
            <div
              className={`p-1.5 rounded-md ${
                isNetPositive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : isNetNegative
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-slate-800 text-slate-400"
              }`}
            >
              {isNetPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : isNetNegative ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isNetPositive
                  ? "text-emerald-400"
                  : isNetNegative
                    ? "text-rose-400"
                    : "text-slate-200"
              }`}
            >
              {formatCurrency(metrics.netPnl)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span>{metrics.totalTrades} Total Closed Trades</span>
              <span>•</span>
              <span className="text-emerald-400">{metrics.winningTrades}W</span>
              <span className="text-rose-400">{metrics.losingTrades}L</span>
              {metrics.breakevenTrades > 0 && (
                <span className="text-slate-400">{metrics.breakevenTrades}BE</span>
              )}
            </div>
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Win Rate
            </span>
            <Target className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl font-bold ${
                metrics.winRate >= 50
                  ? "text-emerald-400"
                  : metrics.winRate > 0
                    ? "text-amber-400"
                    : "text-slate-400"
              }`}
            >
              {metrics.winRate}%
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Loss rate: {metrics.lossRate}%
            </p>
          </div>
        </div>

        {/* Profit Factor Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Profit Factor
            </span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-100">
              {metrics.profitFactor ? `${metrics.profitFactor}` : "—"}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Gross Win / Gross Loss
            </p>
          </div>
        </div>

        {/* Expectancy / Avg R */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Expectancy
            </span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-100">
              {formatCurrency(metrics.expectancy)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Avg R: {metrics.averageR ? `${metrics.averageR}R` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Equity Curve Visualizer */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Cumulative Equity Progression
            </span>
            <span className="text-xs text-slate-400">({equityCurve.length} Points)</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span>Peak: <strong className="text-emerald-400">{formatCurrency(metrics.peakEquity)}</strong></span>
            <span>Max DD: <strong className="text-rose-400">-{formatCurrency(metrics.maxDrawdown)} ({metrics.maxDrawdownPercentage}%)</strong></span>
          </div>
        </div>
        <AnalyticsPerformanceChart equityCurve={equityCurve} />
      </div>
    </div>
  );
}
