/**
 * Analytics Domain — Empty State Component
 */

import React from "react";
import Link from "next/link";

interface AnalyticsEmptyStateProps {
  hasFilters: boolean;
  onResetFilters?: () => void;
}

export function AnalyticsEmptyState({
  hasFilters,
  onResetFilters,
}: AnalyticsEmptyStateProps) {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-sm"
      data-testid="analytics-empty-state"
    >
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>

      <h3 className="text-base font-semibold text-slate-100">
        {hasFilters ? "No Trades Match Your Filters" : "No Trading Data Yet"}
      </h3>

      <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-md">
        {hasFilters
          ? "Try loosening your date range or removing selected tags, symbols, or strategies to view analytics."
          : "Start logging your trades to unlock detailed performance metrics, equity curves, drawdown statistics, and multi-dimensional insights."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {hasFilters && onResetFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Reset All Filters
          </button>
        ) : (
          <Link
            href="/trades/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Log First Trade
          </Link>
        )}
      </div>
    </div>
  );
}
