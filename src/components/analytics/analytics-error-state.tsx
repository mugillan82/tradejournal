/**
 * Analytics Domain — Error State Component
 */

import React from "react";

interface AnalyticsErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function AnalyticsErrorState({
  message = "Failed to load analytics data. Please try again.",
  onRetry,
}: AnalyticsErrorStateProps) {
  return (
    <div
      className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-8 flex flex-col items-center justify-center text-center shadow-sm"
      data-testid="analytics-error-state"
    >
      <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-sm font-semibold text-rose-200">Unable to Load Analytics</h3>
      <p className="mt-1 text-xs text-rose-300/80 max-w-sm">{message}</p>

      <div className="mt-5">
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors"
          data-testid="analytics-retry-btn"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
