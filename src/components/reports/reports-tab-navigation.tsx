/**
 * Reports Domain — Tab Navigation Component
 *
 * Horizontal scrollable tab bar for switching between 9 report types.
 */

"use client";

import React from "react";

export type ReportTabKey =
  | "overview"
  | "symbols"
  | "strategies"
  | "setups"
  | "tags"
  | "mistakes"
  | "accounts"
  | "direction"
  | "time";

interface ReportsTabNavigationProps {
  activeTab: ReportTabKey;
  onTabChange: (tab: ReportTabKey) => void;
  counts?: {
    symbols: number;
    strategies: number;
    setups: number;
    tags: number;
    mistakes: number;
    accounts: number;
  };
}

const REPORT_TABS: Array<{ key: ReportTabKey; label: string; countKey?: keyof NonNullable<ReportsTabNavigationProps["counts"]> }> = [
  { key: "overview", label: "Overview" },
  { key: "symbols", label: "Symbols", countKey: "symbols" },
  { key: "strategies", label: "Strategies", countKey: "strategies" },
  { key: "setups", label: "Setups", countKey: "setups" },
  { key: "tags", label: "Tags", countKey: "tags" },
  { key: "mistakes", label: "Mistakes", countKey: "mistakes" },
  { key: "accounts", label: "Accounts", countKey: "accounts" },
  { key: "direction", label: "Direction" },
  { key: "time", label: "Time" },
];

export function ReportsTabNavigation({
  activeTab,
  onTabChange,
  counts,
}: ReportsTabNavigationProps) {
  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 scrollbar-thin"
      data-testid="reports-tab-navigation"
    >
      {REPORT_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = tab.countKey && counts ? counts[tab.countKey] : undefined;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              isActive
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            data-testid={`report-tab-${tab.key}`}
          >
            <span>{tab.label}</span>
            {count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
