/**
 * Dashboard Domain — Header Component
 *
 * Page title, contextual trading account selector, and refresh button.
 */

"use client";

import React from "react";
import { RefreshCw, LayoutDashboard } from "@/components/icons";
import type { TradingAccountDto } from "@/lib/client/dashboard";

interface DashboardHeaderProps {
  accounts: ReadonlyArray<TradingAccountDto>;
  selectedAccountId?: string;
  onAccountChange: (accountId?: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function DashboardHeader({
  accounts,
  selectedAccountId,
  onAccountChange,
  onRefresh,
  isRefreshing = false,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
              Trading Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Real-time performance metrics, trading journal context, and portfolio analytics.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Account Selector */}
        {accounts.length > 0 && (
          <div className="relative">
            <label htmlFor="dashboard-account-select" className="sr-only">
              Filter by Trading Account
            </label>
            <select
              id="dashboard-account-select"
              value={selectedAccountId || ""}
              onChange={(e) => onAccountChange(e.target.value ? e.target.value : undefined)}
              className="bg-slate-900/90 border border-slate-800 text-slate-200 text-xs sm:text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="">All Accounts ({accounts.length})</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>
  );
}
