/**
 * Analytics Domain — Primary KPI Grid Component
 *
 * Displays 8 primary trading KPI cards formatted with terminal dark aesthetics:
 * - Net P&L
 * - Total Trades
 * - Win Rate
 * - Profit Factor
 * - Expectancy
 * - Average Trade P&L
 * - Average Winner
 * - Average Loser
 */

import React from "react";
import type { CorePerformanceMetricsDto } from "@/lib/client/analytics";

interface AnalyticsKpiGridProps {
  metrics: CorePerformanceMetricsDto;
}

function formatCurrency(amountStr: string | null | undefined): {
  formatted: string;
  isPositive: boolean;
  isNegative: boolean;
  isZero: boolean;
} {
  if (!amountStr) {
    return { formatted: "$0.00", isPositive: false, isNegative: false, isZero: true };
  }
  const num = parseFloat(amountStr);
  if (isNaN(num)) {
    return { formatted: "$0.00", isPositive: false, isNegative: false, isZero: true };
  }

  const isNeg = num < 0;
  const absNum = Math.abs(num);
  const formattedAbs = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absNum);

  return {
    formatted: isNeg ? `-${formattedAbs}` : formattedAbs,
    isPositive: num > 0,
    isNegative: num < 0,
    isZero: num === 0,
  };
}

export function AnalyticsKpiGrid({ metrics }: AnalyticsKpiGridProps) {
  const netPnlInfo = formatCurrency(metrics.netPnl);
  const avgTradeInfo = formatCurrency(metrics.averageTradePnl);
  const avgWinnerInfo = formatCurrency(metrics.averageWinner);
  const avgLoserInfo = formatCurrency(metrics.averageLoser);
  const expectancyInfo = formatCurrency(metrics.expectancy);
  const grossProfitInfo = formatCurrency(metrics.grossProfit);
  const grossLossInfo = formatCurrency(metrics.grossLoss);
  const totalCostsInfo = formatCurrency(metrics.totalCosts);

  // Profit factor formatting
  let profitFactorDisplay = "—";
  if (metrics.profitFactor !== null) {
    profitFactorDisplay = `${metrics.profitFactor}`;
  } else if (parseFloat(metrics.grossProfit) > 0) {
    profitFactorDisplay = "∞";
  }

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      data-testid="analytics-kpi-grid"
    >
      {/* 1. Net P&L */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Net Realized P&L
          </p>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              netPnlInfo.isPositive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : netPnlInfo.isNegative
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {netPnlInfo.isPositive ? "Profitable" : netPnlInfo.isNegative ? "Loss" : "Flat"}
          </span>
        </div>
        <p
          className={`mt-2 text-xl sm:text-2xl font-bold tracking-tight ${
            netPnlInfo.isPositive
              ? "text-emerald-400"
              : netPnlInfo.isNegative
              ? "text-rose-400"
              : "text-slate-100"
          }`}
          data-testid="kpi-net-pnl"
        >
          {netPnlInfo.formatted}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Costs: <span className="text-slate-300 font-medium">{totalCostsInfo.formatted}</span>
        </p>
      </div>

      {/* 2. Total Trades */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Trades
          </p>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {metrics.closedTrades} Closed
          </span>
        </div>
        <p
          className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-100"
          data-testid="kpi-total-trades"
        >
          {metrics.totalTrades}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {metrics.openTrades > 0 ? (
            <span className="text-cyan-400 font-medium">{metrics.openTrades} Active Open</span>
          ) : (
            <span>0 Active Open</span>
          )}
        </p>
      </div>

      {/* 3. Win Rate */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Win Rate
          </p>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              metrics.winRate >= 50
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : metrics.closedTrades > 0
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {metrics.closedTrades > 0 ? `${metrics.winRate}%` : "—"}
          </span>
        </div>
        <p
          className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-100"
          data-testid="kpi-win-rate"
        >
          {metrics.closedTrades > 0 ? `${metrics.winRate}%` : "—"}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          <span className="text-emerald-400 font-medium">{metrics.winningTrades}W</span>
          {" · "}
          <span className="text-rose-400 font-medium">{metrics.losingTrades}L</span>
          {metrics.breakevenTrades > 0 && (
            <>
              {" · "}
              <span className="text-slate-400">{metrics.breakevenTrades}BE</span>
            </>
          )}
        </p>
      </div>

      {/* 4. Profit Factor */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Profit Factor
          </p>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            Ratio
          </span>
        </div>
        <p
          className={`mt-2 text-xl sm:text-2xl font-bold tracking-tight ${
            metrics.profitFactor && parseFloat(metrics.profitFactor) >= 1.5
              ? "text-emerald-400"
              : metrics.profitFactor && parseFloat(metrics.profitFactor) < 1.0
              ? "text-rose-400"
              : "text-slate-100"
          }`}
          data-testid="kpi-profit-factor"
        >
          {profitFactorDisplay}
        </p>
        <p className="mt-1 text-[11px] text-slate-400 truncate">
          +{grossProfitInfo.formatted} / -{grossLossInfo.formatted}
        </p>
      </div>

      {/* 5. Expectancy */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Expectancy
          </p>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            Per Trade
          </span>
        </div>
        <p
          className={`mt-2 text-xl sm:text-2xl font-bold tracking-tight ${
            expectancyInfo.isPositive
              ? "text-emerald-400"
              : expectancyInfo.isNegative
              ? "text-rose-400"
              : "text-slate-100"
          }`}
          data-testid="kpi-expectancy"
        >
          {expectancyInfo.formatted}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">Avg dollar return/trade</p>
      </div>

      {/* 6. Average Trade */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Average Trade
          </p>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            All Closed
          </span>
        </div>
        <p
          className={`mt-2 text-xl sm:text-2xl font-bold tracking-tight ${
            avgTradeInfo.isPositive
              ? "text-emerald-400"
              : avgTradeInfo.isNegative
              ? "text-rose-400"
              : "text-slate-100"
          }`}
          data-testid="kpi-avg-trade"
        >
          {avgTradeInfo.formatted}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">Across {metrics.closedTrades} closed</p>
      </div>

      {/* 7. Average Winner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Average Winner
          </p>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {metrics.winningTrades} Wins
          </span>
        </div>
        <p
          className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-emerald-400"
          data-testid="kpi-avg-winner"
        >
          {avgWinnerInfo.formatted}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Max Win: <span className="text-emerald-400 font-medium">{formatCurrency(metrics.largestWinner).formatted}</span>
        </p>
      </div>

      {/* 8. Average Loser */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Average Loser
          </p>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {metrics.losingTrades} Losses
          </span>
        </div>
        <p
          className={`mt-2 text-xl sm:text-2xl font-bold tracking-tight ${
            metrics.losingTrades > 0 ? "text-rose-400" : "text-slate-100"
          }`}
          data-testid="kpi-avg-loser"
        >
          {avgLoserInfo.formatted}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Max Loss: <span className="text-rose-400 font-medium">{formatCurrency(metrics.largestLoser).formatted}</span>
        </p>
      </div>
    </div>
  );
}
