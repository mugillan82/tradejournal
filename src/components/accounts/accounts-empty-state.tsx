"use client";

import React from "react";
import { Wallet, Plus } from "@/components/icons";

interface AccountsEmptyStateProps {
  onAddAccount: () => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function AccountsEmptyState({
  onAddAccount,
  isFiltered = false,
  onClearFilters,
}: AccountsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
      <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4 shadow-inner">
        <Wallet size={32} />
      </div>

      <h3 className="text-lg font-bold text-slate-100">
        {isFiltered ? "No Matching Accounts Found" : "No Trading Accounts Configured"}
      </h3>

      <p className="mt-2 text-sm text-slate-400 max-w-md">
        {isFiltered
          ? "No accounts match your current search or status filter. Try clearing the filter to see all your accounts."
          : "Add your first trading account (live, paper trading, simulation, or prop firm) to start organizing your trades and portfolio analytics."}
      </p>

      <div className="mt-6 flex items-center gap-3">
        {isFiltered && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        )}
        <button
          type="button"
          onClick={onAddAccount}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        >
          <Plus size={16} />
          <span>Add Trading Account</span>
        </button>
      </div>
    </div>
  );
}
