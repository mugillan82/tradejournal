/**
 * Dashboard Domain — Empty State Component
 */

"use client";

import React from "react";
import Link from "next/link";
import { PlusCircle, LineChart, Wallet } from "@/components/icons";

interface DashboardEmptyStateProps {
  hasAccount: boolean;
}

export function DashboardEmptyState({ hasAccount }: DashboardEmptyStateProps) {
  return (
    <div
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 text-center space-y-5"
      data-testid="dashboard-empty-state"
    >
      <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
        {hasAccount ? <LineChart className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <h3 className="text-base font-semibold text-slate-100">
          {hasAccount ? "No Trading Activity Recorded Yet" : "Get Started with Your Trading Journal"}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400">
          {hasAccount
            ? "Log your first trade or import existing execution history to activate real-time performance analytics, equity curves, and calendar heatmaps."
            : "Create your first trading account to start tracking trades, metrics, and journal entries."}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        {hasAccount ? (
          <Link
            href="/trades/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log First Trade</span>
          </Link>
        ) : (
          <Link
            href="/trades"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Wallet className="w-4 h-4" />
            <span>Setup Trading Account</span>
          </Link>
        )}
      </div>
    </div>
  );
}
