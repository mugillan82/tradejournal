/**
 * Calendar Domain — Empty State Component
 *
 * Rendered when no trades or journal activity exist for the requested month/filters.
 */

import React from "react";
import Link from "next/link";

interface CalendarEmptyStateProps {
  month: string;
  hasFilters: boolean;
  onResetFilters?: () => void;
}

export function CalendarEmptyState({
  month,
  hasFilters,
  onResetFilters,
}: CalendarEmptyStateProps) {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 text-center shadow-sm max-w-md mx-auto my-6"
      data-testid="calendar-empty-state"
    >
      <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>

      <h3 className="text-base font-semibold text-slate-100">
        {hasFilters ? "No Matches for Selected Filters" : `No Activity in ${month}`}
      </h3>

      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
        {hasFilters
          ? "Try loosening your filter parameters or resetting all filters to see trades for this month."
          : "There are no closed trades or journal logs recorded in this month."}
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
