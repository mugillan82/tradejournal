/**
 * Reports Domain — Overview Tab Component
 *
 * Displays full summary metrics, equity curve chart, and performance insights.
 */

"use client";

import React from "react";
import type { ReportOverviewDto } from "@/lib/client/reports";
import { AnalyticsKpiGrid } from "../analytics/analytics-kpi-grid";
import { AnalyticsPerformanceChart } from "../analytics/analytics-performance-chart";
import { AnalyticsSummaryCards } from "../analytics/analytics-summary-cards";

interface ReportOverviewTabProps {
  report: ReportOverviewDto;
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

export function ReportOverviewTab({ report }: ReportOverviewTabProps) {
  const p = report.performance;

  return (
    <div className="space-y-6" data-testid="report-overview-tab">
      {/* 1. Primary KPI Grid */}
      <AnalyticsKpiGrid metrics={p} />

      {/* 2. Equity Curve Chart */}
      <AnalyticsPerformanceChart equityCurve={report.equityCurve} />

      {/* 3. Performance Insights & Summary Cards */}
      <AnalyticsSummaryCards metrics={p} />

      {/* 4. Detailed Financial Summary Matrix */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <span>Comprehensive Financial Summary</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Gross Profit</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              {formatCurrency(p.grossProfit)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Gross Loss</div>
            <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">
              {formatCurrency(p.grossLoss)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Total Fees & Comm.</div>
            <div className="text-sm font-bold font-mono text-slate-300 mt-0.5">
              {formatCurrency(p.totalCosts)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Largest Winner</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              {formatCurrency(p.largestWinner)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Largest Loser</div>
            <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">
              {formatCurrency(p.largestLoser)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Total Risked</div>
            <div className="text-sm font-bold font-mono text-slate-300 mt-0.5">
              {formatCurrency(p.totalRisk)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
