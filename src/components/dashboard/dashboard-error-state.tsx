/**
 * Dashboard Domain — Error State Component
 */

"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "@/components/icons";

interface DashboardErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function DashboardErrorState({ message, onRetry }: DashboardErrorStateProps) {
  return (
    <div
      className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-8 text-center space-y-4 max-w-lg mx-auto my-8"
      data-testid="dashboard-error-state"
    >
      <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-rose-200">
          Failed to load dashboard data
        </h3>
        <p className="text-xs text-rose-300/80">
          {message}
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    </div>
  );
}
