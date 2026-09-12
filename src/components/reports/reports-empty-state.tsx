/**
 * Reports Domain — Empty State Component
 */

import React from "react";
import Link from "next/link";

interface ReportsEmptyStateProps {
  hasFilters: boolean;
  onResetFilters?: () => void;
}

export function ReportsEmptyState({ hasFilters, onResetFilters }: ReportsEmptyStateProps) {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 text-center shadow-sm max-w-md mx-auto my-6"
      data-testid="reports-empty-state"
    >
      <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>

      <h3 className="text-base font-semibold text-slate-100">
        {hasFilters ? "No Report Matches" : "No Trading Data Recorded"}
      </h3>

      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
        {hasFilters
          ? "No trades match the current filter criteria. Try loosening your filter options or resetting them."
          : "Log closed trades in TradeJournal to generate performance reports."}
      </p>

      <div className="mt-5 flex items-center justify-center gap-3">
        {hasFilters && onResetFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Reset Filters
          </button>
        ) : (
          <Link
            href="/trades/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            + Log a Trade
          </Link>
        )}
      </div>
    </div>
  );
}
