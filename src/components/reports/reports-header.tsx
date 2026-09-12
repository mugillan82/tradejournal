/**
 * Reports Domain — Header Component
 *
 * Title, description, and manual refresh trigger.
 */

"use client";

import React from "react";

interface ReportsHeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function ReportsHeader({ onRefresh, isRefreshing = false }: ReportsHeaderProps) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800"
      data-testid="reports-header"
    >
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <span>Performance Reports</span>
          {isRefreshing && (
            <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-normal">
              <svg
                className="animate-spin h-3 w-3 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Updating...
            </span>
          )}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Detailed multi-dimensional breakdown reports for symbols, strategies, setups, mistakes, and timeframes
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 shadow-sm"
        data-testid="reports-refresh-btn"
      >
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Refresh
      </button>
    </div>
  );
}
